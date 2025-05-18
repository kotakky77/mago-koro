class ApplicationController < ActionController::Base
  # Rails 7.1ではallow_browserメソッドはサポートされていません
  include SessionsHelper
end
