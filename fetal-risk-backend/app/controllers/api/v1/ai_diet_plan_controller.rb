# app/controllers/api/v1/ai_diet_plan_controller.rb
class Api::V1::AiDietPlanController < ApplicationController
  before_action :authorize_request

  # POST /api/v1/ai/diet_plan
  def create
    patient = find_patient
    last_reading = patient&.readings&.order(recorded_at: :desc)&.first

    cuisine = params[:cuisine].presence || "Indian"
    date    = params[:date].presence    || Date.current.to_s

    payload = {
      "cuisine" => cuisine,
      "date"    => date,
      "patient" => build_patient_summary(patient),
      "latest_reading" => build_reading_summary(last_reading)
    }

    result = AiDietPlanService.call(payload)

    render json: result, status: :ok
  rescue => e
    Rails.logger.error("[AI DietPlan] #{e.class}: #{e.message}")
    render json: { error: "Failed to generate diet plan." }, status: :internal_server_error
  end

  private

  def find_patient
    pid = params[:patient_id]

    if pid.present?
      Patient.find_by(id: pid, user_id: current_user.id)
    elsif current_user.respond_to?(:patient)
      # your app seems to have `user.patient`
      current_user.patient
    else
      nil
    end
  end

  def build_patient_summary(patient)
    return nil unless patient

    {
      "id"                => patient.id,
      "age"               => (patient.respond_to?(:age) ? patient.age : nil),
      "gestational_weeks" => (patient.respond_to?(:gestational_weeks) ? patient.gestational_weeks : nil),
      "bmi"               => (patient.respond_to?(:bmi) ? patient.bmi : nil)
    }
  end

  def build_reading_summary(reading)
    return nil unless reading

    {
      "recorded_at"  => reading.recorded_at,
      "maternal_hr"  => reading.maternal_hr,
      "fetal_hr"     => reading.fetal_hr,
      "systolic_bp"  => reading.systolic_bp,
      "diastolic_bp" => reading.diastolic_bp,
      "spo2"         => reading.spo2,
      "temperature"  => reading.temperature
    }
  end
end
