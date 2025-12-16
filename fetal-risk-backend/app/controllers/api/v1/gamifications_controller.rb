# app/controllers/api/v1/gamifications_controller.rb
module Api
  module V1
    class GamificationsController < ApplicationController
      before_action :authorize_request

      # GET /api/v1/gamification
      def show
        gamification = find_or_build_gamification
        render json: gamification_json(gamification)
      end

      # PATCH /api/v1/gamification
      def update
        gamification = find_or_build_gamification

        case params[:action_type]
        when "record_activity"
          handle_record_activity(gamification)
        when "claim_reward"
          handle_claim_reward(gamification, params[:reward_id])
        when "reset_streak"
          handle_reset_streak(gamification)
        else
          return render json: { error: "Invalid action_type" }, status: :bad_request
        end

        gamification.save!
        render json: gamification_json(gamification)
      end

      private

      def find_or_build_gamification
        patient = current_user.patient

        Gamification.find_or_create_by!(user: current_user, patient: patient) do |g|
          g.streak_count = 0
          g.points = 0
          g.badges = []
          g.last_active_at = nil
        end
      end

      def handle_record_activity(g)
        now = Time.current

        if g.last_active_at&.to_date == now.to_date
          return
        end

        if g.last_active_at&.to_date == now.to_date - 1
          g.streak_count += 1
        else
          g.streak_count = 1
        end

        g.points += 10
        g.last_active_at = now

        if g.streak_count == 3
          g.badges << "3_day_streak"
        elsif g.streak_count == 7
          g.badges << "7_day_streak"
        end
      end

      def handle_claim_reward(g, reward_id)
        required_points = 50
        return if g.points < required_points

        g.points -= required_points
        g.badges << "reward_#{reward_id}_#{Time.current.to_i}"
      end

      def handle_reset_streak(g)
        g.streak_count = 0
        g.last_active_at = nil
      end

      def gamification_json(g)
        {
          streak_count: g.streak_count,
          points: g.points,
          badges: g.badges,
          last_active_at: g.last_active_at
        }
      end
    end
  end
end