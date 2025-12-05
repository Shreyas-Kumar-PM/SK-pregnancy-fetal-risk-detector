class Api::V1::PatientsController < ApplicationController
  before_action :authorize_request

  def index
    render json: [current_user.patient].compact
  end

  def show
    patient = current_user.patient
    if patient && patient.id.to_s == params[:id].to_s
      render json: patient
    else
      render json: { error: 'Patient not found' }, status: :not_found
    end
  end

  def create
    # Optional: allow user to create/replace patient record
    patient = current_user.build_patient(patient_params)
    if patient.save
      render json: patient, status: :created
    else
      render json: { errors: patient.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    patient = current_user.patient
    if patient&.update(patient_params)
      render json: patient
    else
      render json: { errors: patient&.errors&.full_messages || ['Patient not found'] },
             status: :unprocessable_entity
    end
  end

  private

  def patient_params
    params.require(:patient).permit(
      :name, :age, :gestation_weeks, :gravida, :contact_number, :email
    )
  end
end
