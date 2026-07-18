class UserMailer < ApplicationMailer

  def password_reset(user)
    @user = user
    mail(to: user.email, subject: "まごころおくりもの - パスワード再設定")
  end
end
