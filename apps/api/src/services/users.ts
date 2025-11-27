export const userService = {
  list: ({ tenant }: { tenant: string }) => {
    return [
      {
        id: "sample-user",
        tenant,
        roles: ["admin"],
        auth: {
          passkey: true,
          oauthProviders: ["google", "apple"]
        }
      }
    ];
  }
};
