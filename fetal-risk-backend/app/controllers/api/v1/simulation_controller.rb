class Api::V1::SimulationController < ApplicationController
  before_action :authorize_request
  before_action :set_patient

  def create
    mode = params[:mode] # "critical" or nil

    reading = if mode == "critical"
      # Forced dangerous reading for demo
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

    if reading.save
      evaluation_record = RiskEvaluator.new(@patient, reading).call # ActiveRecord object

      # For demo critical mode, force label + reason on the DB record
      if mode == "critical"
        evaluation_record.update!(
          risk_level: "critical",
          reason: "Simulated critical scenario for demo (severe hypertension, hypoxia, abnormal FHR)."
        )
      end

      # Build a hash for JSON + alerts
      evaluation = {
        "id"         => evaluation_record.id,
        "risk_level" => evaluation_record.risk_level,
        "risk_score" => evaluation_record.risk_score,
        "reason"     => evaluation_record.reason,
        "created_at" => evaluation_record.created_at
      }

      # 🔔 Send email + SMS alerts when needed
      trigger_alerts(evaluation, reading)

      render json: { reading: reading, risk_evaluation: evaluation }, status: :created
    else
      render json: { errors: reading.errors.full_messages }, status: :unprocessable_entity
    end
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

    # 1️⃣ Email alert (async)
    begin
      AlertMailer.risk_alert(user, patient, reading, evaluation).deliver_later
    rescue => e
      Rails.logger.error("Email alert failed: #{e.message}")
    end

    # 2️⃣ SMS alert only for CRITICAL level
    if level == "critical" && patient.contact_number.present?
      message = <<~MSG.strip
        Fetal Risk Alert (CRITICAL) for #{patient.name}.
        Reason: #{evaluation["reason"]}
        Check dashboard immediately.
      MSG

      begin
        SmsAlertService.new(patient.contact_number, message).call
      rescue => e
        Rails.logger.error("SMS alert failed: #{e.message}")
      end
    end
  end
end
