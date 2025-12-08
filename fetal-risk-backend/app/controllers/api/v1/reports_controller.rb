# app/controllers/api/v1/reports_controller.rb
class Api::V1::ReportsController < ApplicationController
  before_action :authorize_request
  before_action :set_patient

  # GET /api/v1/patients/:patient_id/report
  def show
    return if performed?  # if set_patient already rendered an error

    begin
      evaluations = @patient.risk_evaluations
                            .includes(:reading)
                            .order(created_at: :asc)

      pdf = Prawn::Document.new

      # Header
      pdf.text "Fetal Risk Report", size: 20, style: :bold
      pdf.move_down 10

      # Patient summary
      pdf.text "Patient: #{@patient.name}"
      pdf.text "Age: #{@patient.age}"
      pdf.text "Gestation: #{@patient.gestation_weeks} weeks"
      pdf.move_down 5
      pdf.text "Generated at: #{Time.current}", size: 9, style: :italic
      pdf.move_down 15

      if evaluations.any?
        pdf.text "Risk Evaluations", size: 14, style: :bold
        pdf.move_down 8

        evaluations.each_with_index do |e, idx|
          pdf.text "##{idx + 1}", style: :bold
          pdf.text "Time:   #{e.created_at}"
          pdf.text "Level:  #{e.risk_level.to_s.upcase}"
          pdf.text "Score:  #{e.risk_score.to_f.round(3)}"
          pdf.text "Reason: #{e.reason}"

          if e.reading
            pdf.text "Vitals:", style: :bold
            pdf.text "  Maternal HR: #{e.reading.maternal_hr} bpm"
            pdf.text "  BP: #{e.reading.systolic_bp}/#{e.reading.diastolic_bp} mmHg"
            pdf.text "  Fetal HR: #{e.reading.fetal_hr} bpm"
            pdf.text "  Movements: #{e.reading.fetal_movement_count}"
            pdf.text "  SpO₂: #{e.reading.spo2}%"
            pdf.text "  Temperature: #{e.reading.temperature} °C"
          end

          pdf.move_down 10
        end
      else
        pdf.text "No risk evaluations yet for this patient.", style: :italic
      end

      send_data pdf.render,
                filename: "fetal_risk_report_patient_#{@patient.id}.pdf",
                type: "application/pdf",
                disposition: "attachment"

    rescue => e
      Rails.logger.error "REPORT PDF ERROR: #{e.class} - #{e.message}"
      Rails.logger.error e.backtrace.join("\n") if e.backtrace

      render json: { error: "Failed to generate report", details: e.message },
             status: :internal_server_error
    end
  end

  private

  def set_patient
    @patient = Patient.find_by(id: params[:patient_id])

    unless @patient
      render json: { error: "Patient not found" }, status: :not_found
      return
    end

    # Protect access to own patient only
    if defined?(current_user) && @patient.user_id != current_user.id
      render json: { error: "Not authorized for this patient" }, status: :forbidden
    end
  end
end
