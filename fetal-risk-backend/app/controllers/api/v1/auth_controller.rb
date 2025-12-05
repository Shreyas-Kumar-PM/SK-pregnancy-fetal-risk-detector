class Api::V1::AuthController < ApplicationController
  # No auth required for register/login
  def register
    user = User.new(user_params)

    if user.save
      # Create a patient record for this user
      patient = user.create_patient!(
        name: user.name,
        age: user.age,
        gestation_weeks: user.gestation_weeks,
        gravida: user.gravida,
        contact_number: user.contact_number,
        email: user.email
      )

      token = encode_token({ user_id: user.id })

      render json: {
        user: user.as_json(except: [:password_digest]),
        patient_id: patient.id,
        token: token
      }, status: :created
    else
      render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def login
    user = User.find_by(email: params[:email])

    if user&.authenticate(params[:password])
      token = encode_token({ user_id: user.id })
      patient_id = user.patient&.id

      render json: {
        user: user.as_json(except: [:password_digest]),
        patient_id: patient_id,
        token: token
      }, status: :ok
    else
      render json: { error: 'Invalid email or password' }, status: :unauthorized
    end
  end

  def me
    if current_user
      render json: current_user.as_json(except: [:password_digest])
    else
      render json: { error: 'Not authorized' }, status: :unauthorized
    end
  end

  private

  def user_params
    params.require(:user).permit(
      :name, :email, :password, :password_confirmation,
      :age, :gestation_weeks, :gravida, :contact_number
    )
  end
end
