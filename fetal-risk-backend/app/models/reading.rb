class Reading < ApplicationRecord
  belongs_to :patient
  has_one :risk_evaluation, dependent: :destroy
end

