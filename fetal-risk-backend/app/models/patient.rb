class Patient < ApplicationRecord
  belongs_to :user, optional: true

  has_many :readings, dependent: :destroy
  has_many :risk_evaluations, dependent: :destroy
end
