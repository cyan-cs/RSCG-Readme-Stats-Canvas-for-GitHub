import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      username?: string;
      location?: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    username?: string;
    location?: string;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
          username: profile.login,
          location: profile.location || null,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.username = (user as { username?: string }).username;
        token.location = (user as { location?: string }).location;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.username = token.username;
        session.user.location = token.location;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
