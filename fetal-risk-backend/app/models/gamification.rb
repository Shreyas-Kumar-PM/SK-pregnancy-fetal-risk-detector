# app/models/gamification.rb
class Gamification < ApplicationRecord
  belongs_to :user
  belongs_to :patient, optional: true

  validates :streak_count, numericality: { greater_than_or_equal_to: 0 }
  validates :points, numericality: { greater_than_or_equal_to: 0 }

  # convenience: ensure badges is array
  before_save do
    self.badges = [] if badges.nil?
  end
end
