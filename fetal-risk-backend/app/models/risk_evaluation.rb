class RiskEvaluation < ApplicationRecord
  belongs_to :patient
  belongs_to :reading
end
