class Api::V1::PatientsController < ApplicationController
  before_action :authorize_request
  before_action :set_patient, only: [:show, :update]

  # GET /api/v1/patients
  # We expect one patient per user in this app; return it in an array for the current UI.
  def index
    render json: [current_user.patient].compact
  end

  # GET /api/v1/patients/:id
  def show
    if @patient
      render json: @patient
    else
      render json: { error: 'Patient not found' }, status: :not_found
    end
  end

  # POST /api/v1/patients
  # If a patient already exists for this user, update it (idempotent behaviour).
  def create
    if current_user.patient.present?
      # Option A: update existing record (keeps a single patient per user).
      if current_user.patient.update(patient_params)
        render json: current_user.patient, status: :ok
      else
        render json: { errors: current_user.patient.errors.full_messages },
               status: :unprocessable_entity
      end
    else
      # create new patient
      patient = current_user.build_patient(patient_params)
      if patient.save
        render json: patient, status: :created
      else
        render json: { errors: patient.errors.full_messages },
               status: :unprocessable_entity
      end
    end
  end

  # PUT /api/v1/patients/:id
  def update
    unless @patient
      render json: { error: 'Patient not found' }, status: :not_found and return
    end

    if @patient.update(patient_params)
      render json: @patient, status: :ok
    else
      render json: { errors: @patient.errors.full_messages },
             status: :unprocessable_entity
    end
  end

  private

  def set_patient
    # ensure the patient returned is the one belonging to current_user
    # If you want `:id` verification, you can also check params[:id] matches @patient.id
    @patient = current_user.patient
  end

  def patient_params
    # Add new permitted attributes here if you add new fields to Patient model
    params.require(:patient).permit(
      :name,
      :age,
      :gestation_weeks,
      :gravida,
      :contact_number,
      :email
    )
  end
end
