class Api::V1::RiskController < ApplicationController
  before_action :authorize_request
  before_action :set_patient

  def current
    evaluation = @patient.risk_evaluations
                         .includes(:reading)
                         .order(created_at: :desc)
                         .first

    unless evaluation
      render json: {
        risk_level: "normal",
        risk_score: 0.1,
        reason: "No risk evaluations yet."
      }
      return
    end

    reading = evaluation.reading

    # Build payload EXACTLY as ML expects
    payload = {
      age: @patient.age || 25,
      systolic_bp: reading.systolic_bp || 120,
      diastolic_bp: reading.diastolic_bp || 80,
      glucose: reading.respond_to?(:glucose) ? reading.glucose : 110,
      heart_rate: reading.maternal_hr || reading.heart_rate || 75
    }

    prediction = Ml::RiskPredictor.call(payload)

    render json: {
      id: evaluation.id,
      risk_level: prediction["risk_level"],
      risk_score: prediction["risk_score"],
      reason: prediction["reason"] || "ML prediction",
      created_at: evaluation.created_at,
      updated_at: evaluation.updated_at,
      reading: {
        id: reading.id,
        systolic_bp: reading.systolic_bp,
        diastolic_bp: reading.diastolic_bp,
        maternal_hr: reading.maternal_hr,
        recorded_at: reading.recorded_at
      }
    }
  end

  def history
    render json: @patient.risk_evaluations
                         .order(created_at: :desc)
                         .limit(200)
  end

  private

  def set_patient
    @patient = Patient.find_by(id: params[:patient_id])

    unless @patient && @patient.user_id == current_user.id
      render json: { error: "Not authorized" }, status: :forbidden
    end
  end
end
