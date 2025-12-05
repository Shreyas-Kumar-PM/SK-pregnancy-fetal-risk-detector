class Api::V1::SimulationController < ApplicationController
  before_action :authorize_request
  before_action :set_patient

  def create
    mode = params[:mode] # "critical" or nil

    reading = if mode == 'critical'
      # 🔴 Force an obviously dangerous reading for demo
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
      # 🟢 Existing “normal-ish” random simulation
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
      evaluation = RiskEvaluator.new(@patient, reading).call

      # 🔴 For demo, if mode=critical, make sure it’s marked critical even if model is too “nice”
      if mode == 'critical'
        evaluation['risk_level'] = 'critical'
        evaluation['reason'] = 'Simulated critical scenario for demo (severe hypertension, hypoxia, abnormal FHR).'
      end

      render json: { reading: reading, risk_evaluation: evaluation }, status: :created
    else
      render json: { errors: reading.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def set_patient
    @patient = current_user.patient
    unless @patient && @patient.id.to_s == params[:patient_id].to_s
      render json: { error: 'Patient not found' }, status: :not_found
    end
  end
end
