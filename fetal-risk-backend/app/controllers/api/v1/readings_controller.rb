class Api::V1::ReadingsController < ApplicationController
  before_action :authorize_request
  before_action :set_patient

  def index
    readings = @patient.readings.order(recorded_at: :desc).limit(100)
    render json: readings
  end

  def create
    reading = @patient.readings.new(reading_params)
    reading.recorded_at ||= Time.current

    if reading.save
      evaluation = RiskEvaluator.new(@patient, reading).call
      render json: { reading: reading, risk_evaluation: evaluation }, status: :created
    else
      render json: { errors: reading.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

def set_patient
  @patient = Patient.find_by(id: params[:patient_id])
  unless @patient
    render json: { error: 'Patient not found' }, status: :not_found
  end
end

  def reading_params
    params.require(:reading).permit(
      :maternal_hr, :systolic_bp, :diastolic_bp,
      :fetal_hr, :fetal_movement_count, :spo2, :temperature
    )
  end
end
