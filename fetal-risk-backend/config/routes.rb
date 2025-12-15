# config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do

      # ---------------- Auth ----------------
      post "register", to: "auth#register"
      post "login",    to: "auth#login"
      get  "me",       to: "auth#me"

      # ---------------- Patients ----------------
      resources :patients, only: %i[index show create update] do
        resources :readings, only: %i[index create]

        get "current_risk",  to: "risk#current"
        get "risk_history",  to: "risk#history"
        get "risk_forecast", to: "risk_forecasts#show"
        get :report, to: "reports#show"

        post :ai_patterns, to: "ai_patterns#create"
      end

      post "patients/:patient_id/simulate_reading", to: "simulation#create"

      # ---------------- AI ----------------
      post "explain", to: "explain#create"
      post "ai_health_search", to: "ai_health_search#create"
      post "ai/care_coach", to: "ai_care_coach#create"
      post "ai/diet_plan", to: "ai_diet_plan#create"

      # ---------------- Gamification ----------------
      resource :gamification, only: [:show, :update]

    end
  end
end
