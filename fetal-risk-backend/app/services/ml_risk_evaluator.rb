require "open3"
require "json"

class MlRiskEvaluator
  def initialize(patient, reading)
    @patient = patient
    @reading = reading
  end

  def call
    # Build JSON input for Python model
    input = {
      maternal_hr:          @reading.maternal_hr,
      systolic_bp:          @reading.systolic_bp,
      diastolic_bp:         @reading.diastolic_bp,
      fetal_hr:             @reading.fetal_hr,
      fetal_movement_count: @reading.fetal_movement_count,
      spo2:                 @reading.spo2,
      temperature:          @reading.temperature
    }.to_json

    # predict.py is in ../ml relative to Rails root
    # Rails.root -> fetal-risk-backend
    python_path = Rails.root.join("..", "ml", "predict.py").to_s

    # IMPORTANT: pass arguments as an array, NOT a single string.
    # This avoids all issues with spaces in paths.
    stdout, stderr, status = Open3.capture3("python3", python_path, input)

    unless status.success?
      Rails.logger.error("ML ERROR: #{stderr}")
      return fallback
    end

    begin
      result = JSON.parse(stdout)
    rescue JSON::ParserError => e
      Rails.logger.error("ML JSON PARSE ERROR: #{e.message} — output was: #{stdout.inspect}")
      return fallback
    end

    {
      "risk_level" => result["risk_level"],
      "risk_score" => result["risk_score"],
      "reason"     => result["reason"]
    }
  rescue => e
    Rails.logger.error("ML FAILED: #{e.class}: #{e.message}")
    fallback
  end

  private

  def fallback
    {
      "risk_level" => "normal",
      "risk_score" => 0.1,
      "reason"     => "Fallback ML model (normal)"
    }
  end
end
