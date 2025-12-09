Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      # Auth
      post 'register', to: 'auth#register'
      post 'login',    to: 'auth#login'
      get  'me',       to: 'auth#me'
      
      # Existing resources
      resources :patients, only: [:index, :show, :create, :update] do
      resources :readings, only: [:index, :create]
      get 'current_risk',   to: 'risk#current'
      get 'risk_history',   to: 'risk#history'
      get 'risk_forecast',  to: 'risk_forecasts#show'   # ⬅ NEW
      get :report,          to: "reports#show"
    end
      post 'patients/:patient_id/simulate_reading', to: 'simulation#create'
      # ⭐ New: AI "Explain My Risk" endpoint
      post 'explain', to: 'explain#create'
      post "ai_health_search", to: "ai_health_search#create"
      post "ai/care_coach", to: "ai_care_coach#create"
    end
  end
end
