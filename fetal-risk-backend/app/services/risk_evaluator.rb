class RiskEvaluator
  def initialize(patient, reading)
    @patient = patient
    @reading = reading
  end

  def call
    ml_result = MlRiskEvaluator.new(@patient, @reading).call

    RiskEvaluation.create!(
      patient: @patient,
      reading: @reading,
      risk_level: ml_result['risk_level'],
      risk_score: ml_result['risk_score'],
      reason: ml_result['reason']
    )
  end
end
