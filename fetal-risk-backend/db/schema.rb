# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2025_12_05_091036) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "patients", force: :cascade do |t|
    t.integer "age"
    t.string "contact_number"
    t.datetime "created_at", null: false
    t.string "email"
    t.integer "gestation_weeks"
    t.integer "gravida"
    t.string "name"
    t.datetime "updated_at", null: false
    t.integer "user_id"
    t.index ["user_id"], name: "index_patients_on_user_id"
  end

  create_table "readings", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "diastolic_bp"
    t.integer "fetal_hr"
    t.integer "fetal_movement_count"
    t.integer "maternal_hr"
    t.integer "patient_id", null: false
    t.datetime "recorded_at"
    t.integer "spo2"
    t.integer "systolic_bp"
    t.float "temperature"
    t.datetime "updated_at", null: false
    t.index ["patient_id"], name: "index_readings_on_patient_id"
  end

  create_table "risk_evaluations", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "patient_id", null: false
    t.integer "reading_id", null: false
    t.text "reason"
    t.string "risk_level"
    t.float "risk_score"
    t.datetime "updated_at", null: false
    t.index ["patient_id"], name: "index_risk_evaluations_on_patient_id"
    t.index ["reading_id"], name: "index_risk_evaluations_on_reading_id"
  end

  create_table "users", force: :cascade do |t|
    t.integer "age"
    t.string "contact_number"
    t.datetime "created_at", null: false
    t.string "email"
    t.integer "gestation_weeks"
    t.integer "gravida"
    t.string "name"
    t.string "password_digest"
    t.datetime "updated_at", null: false
  end

  add_foreign_key "patients", "users"
  add_foreign_key "readings", "patients"
  add_foreign_key "risk_evaluations", "patients"
  add_foreign_key "risk_evaluations", "readings"
end
