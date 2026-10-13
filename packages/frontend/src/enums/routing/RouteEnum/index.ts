export enum RouteEnum {
  HOME = "/",
  FOLDERS = "/folders",
  FOLDER = `${RouteEnum.FOLDERS}/:folderId`,
  SETTINGS = "/settings",
  USERS = "/users",
  CHANGE_PASSWORD = "/change-password",
  SIGN_IN = "/sign-in",
  SIGN_UP = "/sign-up",
  VERIFY_EMAIL = "/verify-email",
  FORGOT_PASSWORD = "/forgot-password",
}
