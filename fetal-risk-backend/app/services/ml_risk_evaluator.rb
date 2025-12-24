require "net/http"
require "json"
require "uri"

class MlRiskEvaluator
  ML_URL = ENV.fetch(
    "ML_SERVICE_URL",
    "https://skfetal-risk-ml.onrender.com/predict"
  )

  def initialize(patient, reading)
    @patient = patient
    @reading = reading
  end

  def call
    uri = URI(ML_URL)

    payload = {
      age: @patient.age,
      systolic_bp: @reading.systolic_bp,
      diastolic_bp: @reading.diastolic_bp,
      glucose: @reading.glucose,
      heart_rate: @reading.maternal_hr
    }

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true

    request = Net::HTTP::Post.new(uri.path, {
      "Content-Type" => "application/json"
    })
    request.body = payload.to_json

    response = http.request(request)

    unless response.is_a?(Net::HTTPSuccess)
      Rails.logger.error("ML HTTP ERROR: #{response.code} #{response.body}")
      return fallback
    end

    result = JSON.parse(response.body)

    {
      "risk_level" => result["risk_level"],
      "risk_score" => result["risk_score"],
      "reason"     => "Predicted by ML service"
    }
  rescue => e
    Rails.logger.error("ML CALL FAILED: #{e.message}")
    fallback
  end

  private

  def fallback
    {
      "risk_level" => "normal",
      "risk_score" => 0.1,
      "reason"     => "Fallback (ML unavailable)"
    }
  end
end
