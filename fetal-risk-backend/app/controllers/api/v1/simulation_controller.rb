class Api::V1::SimulationController < ApplicationController
  before_action :authorize_request
  before_action :set_patient

  def create
    mode = params[:mode] # "critical" or nil

    reading =
      if mode == "critical"
        # 🚨 Forced dangerous reading for demo
        @patient.readings.new(
          maternal_hr: 135,
          systolic_bp: 180,
          diastolic_bp: 115,
          fetal_hr: 90,                 # bradycardia
          fetal_movement_count: 0,      # no movement
          spo2: 85,                     # hypoxia
          temperature: 39.2,            # fever
          recorded_at: Time.current
        )
      else
        # Normal-ish random simulation
        @patient.readings.new(
          maternal_hr: rand(70..110),
          systolic_bp: rand(100..150),
          diastolic_bp: rand(60..95),
          fetal_hr: rand(110..170),
          fetal_movement_count: rand(0..30),
          spo2: rand(94..100),
          temperature: rand(36.5..37.8).round(1),
          recorded_at: Time.current
        )
      end

    unless reading.save
      render json: { errors: reading.errors.full_messages }, status: :unprocessable_entity
      return
    end

    # 🔵 Run normal evaluator first
    evaluation_record = RiskEvaluator.new(@patient, reading).call

    # 🚨 DEMO OVERRIDE (THIS IS THE FIX)
    if mode == "critical"
      evaluation_record.update!(
        risk_level: "critical",
        risk_score: 0.95,
        reason: "Simulated critical scenario for demo: severe hypertension, hypoxia, abnormal fetal heart rate, and fever."
      )
    end

    evaluation = {
      "id"         => evaluation_record.id,
      "risk_level" => evaluation_record.risk_level,
      "risk_score" => evaluation_record.risk_score,
      "reason"     => evaluation_record.reason,
      "created_at" => evaluation_record.created_at
    }

    # 🔔 Trigger alerts using FINAL risk values
    trigger_alerts(evaluation, reading)

    render json: {
      reading: reading,
      risk_evaluation: evaluation
    }, status: :created
  end

  private

  def set_patient
    @patient = current_user.patient
    unless @patient && @patient.id.to_s == params[:patient_id].to_s
      render json: { error: "Patient not found" }, status: :not_found
    end
  end

  def trigger_alerts(evaluation, reading)
    level = evaluation["risk_level"]
    return unless %w[warning critical].include?(level)

    user    = current_user
    patient = @patient

    # 📧 Email alert (async)
    begin
      AlertMailer.risk_alert(user, patient, reading, evaluation).deliver_later
    rescue => e
      Rails.logger.error("Email alert failed: #{e.message}")
    end

    # 📱 SMS alert (CRITICAL only)
    if level == "critical" && patient.contact_number.present?
      message = <<~MSG.strip
        🚨 FETAL RISK ALERT (CRITICAL)
        Patient: #{patient.name}
        Reason: #{evaluation["reason"]}
        Please check the dashboard immediately.
      MSG

      begin
        SmsAlertService.new(patient.contact_number, message).call
      rescue => e
        Rails.logger.error("SMS alert failed: #{e.message}")
      end
    end
  end
end
