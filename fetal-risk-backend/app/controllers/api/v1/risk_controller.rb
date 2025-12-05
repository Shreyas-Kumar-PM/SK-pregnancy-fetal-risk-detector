class Api::V1::RiskController < ApplicationController
  before_action :authorize_request
  before_action :set_patient

  def current
    last_reading = @patient.readings.order(recorded_at: :desc).first
    if last_reading.nil?
      render json: { message: 'No readings available', risk_level: 'unknown' }
      return
    end

    evaluation = last_reading.risk_evaluation || RiskEvaluator.new(@patient, last_reading).call
    render json: evaluation
  end

  def history
    evaluations = @patient.risk_evaluations.order(created_at: :desc).limit(100)
    render json: evaluations
  end

  private

  def set_patient
    @patient = current_user.patient
    unless @patient && @patient.id.to_s == params[:patient_id].to_s
      render json: { error: 'Patient not found' }, status: :not_found
    end
  end
end
