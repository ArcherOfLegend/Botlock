import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as SteamStrategy } from "passport-steam";

import { setSteamId } from "./registerCommand.js"; // our JSON storage

const app = express();

// Session middleware (needed for passport)
app.use(session({
  secret: "", // change this
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

// Steam OAuth strategy
passport.use(new SteamStrategy({
  returnURL: "http://localhost:3000/auth/steam/return",
  realm: "http://localhost:3000/",
  apiKey: process.env.STEAM_API_KEY
}, (identifier, profile, done) => {
  return done(null, profile);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Login endpoint
app.get("/auth/steam", passport.authenticate("steam"));

// Callback endpoint
app.get("/auth/steam/return",
  passport.authenticate("steam", { failureRedirect: "/" }),
  (req, res) => {
    const discordId = req.session.discordId; // we’ll pass this in the URL
    const steamId = req.user.id;

    if (discordId) {
      setSteamId(discordId, steamId);
      res.send("Successfully linked your Steam account! You can return to Discord.");
    } else {
      res.send("Missing Discord ID, try again.");
    }
  }
);

// Start server
app.listen(3000, () => {
  console.log("✅ Auth server running at http://localhost:3000");
});
