class ApplicationController < ActionController::API
  SECRET_KEY = Rails.application.secret_key_base

  private

  def encode_token(payload)
    JWT.encode(payload, SECRET_KEY)
  end

  def auth_header
    request.headers['Authorization']
  end

  def decoded_token
    return nil unless auth_header

    token = auth_header.split(' ')[1] # "Bearer <token>"
    begin
      JWT.decode(token, SECRET_KEY, true, algorithm: 'HS256')
    rescue JWT::DecodeError
      nil
    end
  end

  def current_user
    return @current_user if defined?(@current_user)

    if decoded_token
      user_id = decoded_token[0]['user_id']
      @current_user = User.find_by(id: user_id)
    else
      @current_user = nil
    end
  end

  def authorize_request
    render json: { error: 'Not authorized' }, status: :unauthorized unless current_user
  end
end
