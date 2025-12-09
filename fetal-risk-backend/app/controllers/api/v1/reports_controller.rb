# app/controllers/api/v1/reports_controller.rb
class Api::V1::ReportsController < ApplicationController
  before_action :authorize_request
  before_action :set_patient

  # GET /api/v1/patients/:patient_id/report
  def show
    return if performed? # set_patient might have rendered an error

    evaluation = @patient.risk_evaluations
                         .includes(:reading)
                         .order(created_at: :desc)
                         .first

    unless evaluation
      render json: { error: "No risk evaluations yet for this patient." },
             status: :not_found
      return
    end

    reading = evaluation.reading

    # ---------- derive age for ML (same as RiskController) ----------
    age =
      if @patient.respond_to?(:age) && @patient.age.present?
        @patient.age
      elsif @patient.respond_to?(:date_of_birth) && @patient.date_of_birth.present?
        ((Time.zone.today - @patient.date_of_birth) / 365.25).floor
      else
        25
      end

    # ---------- derive blood sugar (bs) ----------
    bs =
      if reading.respond_to?(:bs) && reading.bs.present?
        reading.bs
      elsif reading.respond_to?(:blood_sugar) && reading.blood_sugar.present?
        reading.blood_sugar
      else
        90
      end

    # ---------- fallbacks for other vitals required by ML ----------
    maternal_hr  = reading.maternal_hr.presence  || 90
    systolic_bp  = reading.systolic_bp.presence  || 120
    diastolic_bp = reading.diastolic_bp.presence || 80
    temperature  = reading.temperature.presence  || 36.8

    vitals = {
      maternal_hr:          maternal_hr,
      systolic_bp:          systolic_bp,
      diastolic_bp:         diastolic_bp,
      fetal_hr:             reading.fetal_hr,
      fetal_movement_count: reading.fetal_movement_count,
      spo2:                 reading.spo2,
      temperature:          temperature,
      age:                  age,
      bs:                   bs
    }

    ml_prediction = nil
    begin
      ml_prediction = Ml::RiskPredictor.call(vitals)
    rescue Ml::RiskPredictor::PredictionError => e
      Rails.logger.error("ReportsController ML prediction failed: #{e.message}")
      # we still generate a PDF using the stored evaluation
      ml_prediction = nil
    end

    # ---------- build PDF inline using Prawn ----------
    # Ensure prawn gem is in your Gemfile (it was in the original project):
    # gem 'prawn'
    pdf = Prawn::Document.new

    # Header
    pdf.text "SK Fetal Risk Detector", size: 18, style: :bold
    pdf.move_down 5
    pdf.text "Maternal–Fetal Risk Report", size: 14
    pdf.move_down 10

    # Patient info
    pdf.text "Patient Information", style: :bold
    pdf.text "Name: #{@patient.name}" if @patient.respond_to?(:name)
    pdf.text "Patient ID: #{@patient.id}"
    pdf.text "Age: #{age} years"
    pdf.move_down 10

    # Vitals at time of evaluation
    pdf.text "Latest Vitals", style: :bold
    pdf.text "Recorded at: #{reading.recorded_at&.strftime('%d-%m-%Y %I:%M %p')}"
    pdf.move_down 5

    pdf.table(
      [
        ["Maternal HR (bpm)", maternal_hr],
        ["Systolic BP (mmHg)", systolic_bp],
        ["Diastolic BP (mmHg)", diastolic_bp],
        ["SpO₂ (%)", reading.spo2],
        ["Body Temp (°C)", temperature],
        ["Fetal HR (bpm)", reading.fetal_hr],
        ["Fetal movements", reading.fetal_movement_count],
        ["Blood sugar (BS)", bs]
      ],
      header: false,
      cell_style: { borders: [:bottom], padding: [2, 4, 2, 4] }
    )

    pdf.move_down 10

    # Heuristic evaluation
    pdf.text "Heuristic Risk Evaluation", style: :bold
    pdf.text "Risk level: #{evaluation.risk_level}"
    pdf.text "Risk score: #{evaluation.risk_score}"
    pdf.text "Reason: #{evaluation.reason}"
    pdf.move_down 10

    # ML section (if we got a prediction)
    if ml_prediction.present?
      pdf.text "Machine Learning Evaluation", style: :bold
      pdf.text "Model version: #{ml_prediction['model_version']}" if ml_prediction['model_version']
      pdf.text "RF ML risk level: #{ml_prediction['ml_risk_level']}" if ml_prediction['ml_risk_level']

      if (rf_probs = ml_prediction['ml_class_probabilities']).present?
        pdf.move_down 5
        pdf.text "RF class probabilities:"
        rf_probs.each do |label, p|
          pdf.text "  • #{label}: #{(p * 100.0).round(1)}%"
        end
      end

      if ml_prediction['ml_logreg_risk_level']
        pdf.move_down 5
        pdf.text "Logistic Regression risk level: #{ml_prediction['ml_logreg_risk_level']}"
      end

      if (lg_probs = ml_prediction['ml_logreg_class_probabilities']).present?
        pdf.text "LogReg class probabilities:"
        lg_probs.each do |label, p|
          pdf.text "  • #{label}: #{(p * 100.0).round(1)}%"
        end
      end
    else
      pdf.text "Machine Learning Evaluation", style: :bold
      pdf.text "ML prediction was not available; report shows stored heuristic evaluation only."
    end

    pdf.move_down 15
    pdf.text "Generated on: #{Time.zone.now.strftime('%d-%m-%Y %I:%M %p')}", size: 9

    pdf_data = pdf.render

    send_data pdf_data,
              filename: "risk-report-patient-#{@patient.id}.pdf",
              type: "application/pdf",
              disposition: "attachment"
  rescue => e
    Rails.logger.error("ReportsController#show failed: #{e.class} - #{e.message}")
    Rails.logger.error(e.backtrace.join("\n"))
    render json: { error: "Failed to generate report." },
           status: :internal_server_error
  end

  private

  def set_patient
    @patient = Patient.find_by(id: params[:patient_id])

    unless @patient
      render json: { error: "Patient not found" }, status: :not_found
      return
    end

    if @patient.user_id != current_user.id
      render json: { error: "Not authorized for this patient" }, status: :forbidden
      return
    end
  end
end
