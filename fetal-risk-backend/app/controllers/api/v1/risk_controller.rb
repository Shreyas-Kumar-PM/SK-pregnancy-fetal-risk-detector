# app/controllers/api/v1/risk_controller.rb
class Api::V1::RiskController < ApplicationController
  before_action :authorize_request
  before_action :set_patient

  # GET /api/v1/patients/:patient_id/current_risk
  def current
    return if performed?  # if set_patient already rendered error

    evaluation = @patient.risk_evaluations
                         .includes(:reading)
                         .order(created_at: :desc)
                         .first

    if evaluation
      render json: {
        id:         evaluation.id,
        risk_level: evaluation.risk_level,
        risk_score: evaluation.risk_score,
        reason:     evaluation.reason,
        created_at: evaluation.created_at,
        updated_at: evaluation.updated_at,
        reading: {
          id:         evaluation.reading.id,
          maternal_hr: evaluation.reading.maternal_hr,
          systolic_bp: evaluation.reading.systolic_bp,
          diastolic_bp: evaluation.reading.diastolic_bp,
          fetal_hr:    evaluation.reading.fetal_hr,
          fetal_movement_count: evaluation.reading.fetal_movement_count,
          spo2:        evaluation.reading.spo2,
          temperature: evaluation.reading.temperature,
          recorded_at: evaluation.reading.recorded_at
        }
      }
    else
      render json: {
        risk_level: nil,
        risk_score: nil,
        reason:     "No risk evaluations yet for this patient."
      }, status: :ok
    end
  end

  # GET /api/v1/patients/:patient_id/risk_history
  def history
    return if performed?

    evaluations = @patient.risk_evaluations
                          .order(created_at: :desc)
                          .limit(200)

    render json: evaluations.as_json(
      only: %i[id risk_level risk_score reason created_at updated_at reading_id]
    )
  end

  private

  def set_patient
    @patient = Patient.find_by(id: params[:patient_id])

    unless @patient
      render json: { error: "Patient not found" }, status: :not_found
      return
    end

    # Optional: ensure this patient belongs to current_user
    if @patient.user_id != current_user.id
      render json: { error: "Not authorized for this patient" }, status: :forbidden
      return
    end
  end
end
