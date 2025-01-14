import logging

from flask import current_app

from superset.security import SupersetSecurityManager


class CustomSsoSecurityManager(SupersetSecurityManager):

    def oauth_user_info(self, provider, response=None):
        logging.debug(f"Oauth2 provider: {provider}.")

        if provider == "ACF-SSO":
            # retrieve user info using validated token
            access_token = response["access_token"]
            headers = {"Authorization": f"Bearer {access_token}"}
            oauth_provider = self.appbuilder.sm.oauth_remotes[provider]
            userinfo_url = current_app.config["ACF_USERINFO_URL"]
            data = oauth_provider.get(userinfo_url, headers=headers)

            # convert data to json
            me = data.json()
            logging.debug(f"user data from ACF_USERINFO_URL: {str(me)}.")

            username = me["preferred_username"]
            email = me["email"]
            name = me["name"]
            first_name = me["given_name"]
            last_name = me["family_name"]
            admins = current_app.config["ADMINS"]

            # default to use Gamma (read-only)
            role = "Gamma"
            # if user is admin then use Admin
            if email in admins:
                role = "Admin"

            role_obj = [self.find_role(role)]

            logging.debug(f"{str(email)}'s role is {str(role_obj)}")

            user = self.find_user(email=email)

            if user:
                logging.debug(f"Found user {str(user)} and role is {str(user.roles)}")

                role_names = [role.name for role in user.roles]

                if role not in role_names:
                    logging.debug(f"Updating user {str(user)} to role {str(role_obj)}")
                    user.roles = role_obj
                    success = self.update_user(user)
                    if not success:
                        logging.error(
                            f"Failed updating user {str(user)} to role {str(role_obj)}"
                        )
                    else:
                        logging.debug(
                            f"Updated user {str(user)} to role {str(role_obj)}"
                        )

            else:
                logging.debug(f"User {str(email)} not found")
                user = self.add_user(
                    username=username,
                    first_name=first_name,
                    last_name=last_name,
                    email=email,
                    role=role_obj,
                )
                if not user:
                    logging.error(f"Failed creating user {str(email)}")
                else:
                    logging.debug(
                        f"Added user {str(user)} and role is {str(user.roles)}"
                    )

            return {
                "name": name,
                "email": email,
                "id": username,
                "username": username,
                "first_name": first_name,
                "last_name": last_name,
            }
        return super().oauth_user_info(provider, response)
