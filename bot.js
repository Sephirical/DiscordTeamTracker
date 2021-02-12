const Discord = require('discord.js');
const client = new Discord.Client();
const auth = require('./auth.json');
const fs = require('fs');
const verifQs = [
  "What is your full name?",
  "What is your email?",
  "Are you an ARC member? Answer with Y or N!",
  "What is your zID? E.g. z1234567",
  "What is your phone number?"
];
const applying = [];
let verifiedUsers = JSON.parse(fs.readFileSync('./verification.json'));
let teams = JSON.parse(fs.readFileSync('./registeredteams.json'));
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});
let invites = new Map();
var invalidNames = ["rules", "verification", "team-registration", "general", "team-finder", "questions", "puzzle-hunt-rules", "puzzle-release", "spoiler-free-discussion", 
  "team registration", "team finder", "puzzle hunt rules", "puzzle release", "spoiler free discussion", "read me", "read-me", "boss channels", "boss-channels"];

client.on('message', async msg => {
  if (msg.author.bot) return;
  let user = msg.author;
  let guild = msg.guild;
  var isVerified = await msg.member.roles.cache.find(x => x.name === 'Verified');
  if (msg.content.startsWith('!registerteam')) {
    if (!isVerified) {
      msg.channel.send(`${user}, you can only register your team once you are verified!`);
      return;
    } else if ((msg.member.roles.cache.map(roles => `${roles}`).length > 2 && !msg.member.hasPermission("ADMINISTRATOR")) || 
      (msg.member.roles.cache.map(roles => `${roles}`).length > 3 && msg.member.hasPermission("ADMINISTRATOR"))) {
      msg.channel.send(`${user}, you're already in a team!`);
      return;
    }
    let args = msg.content.split(" ");
    if (args.length == 1) {
      msg.channel.send(`${user}, incorrect arguments! Usage: !register <name>`);      
    } else {
      args.shift();
      let teamname = args.join(" ");
      if (invalidNames.includes(teamname.toLowerCase())) {
          msg.channel.send(`${user}, invalid team name! Please try again.`);
      }
      let role = msg.guild.roles.cache.find(x => x.name == teamname);
      console.log(`role = ${role}`);
      if (!role) {
        const newrole = await msg.guild.roles.create({
          data: {
            name: `${teamname}`,
            color: 'BLUE',
            hoist: true,
          },
          reason: 'we needed a role for Super Cool People',
        })
          .then(console.log(`Successfully created role ${teamname}`))
          .catch(console.error);
        msg.channel.send(`Successfully created ${teamname} role!`);
        let member = msg.member;
        member.roles.add(newrole);
        teams[`${teamname}`] = {
          "members": [verifiedUsers[member.id].name]
        }
        fs.writeFile('./registeredteams.json', JSON.stringify(teams), (err) => {
          if (err) console.error(err);
        });
        console.log(`${newrole.id}`);
        const newcat = await msg.guild.channels.create(`${teamname}`, { 
          type: 'category',
          permissionOverwrites: [
            {
              id: msg.guild.roles.everyone.id,
              deny: ['VIEW_CHANNEL'],
            },
            {
              id: newrole.id,
              allow: ['VIEW_CHANNEL'],
            },
          ],
        })
          .then(console.log(`Successfully created category ${teamname}!`))
          .catch(console.error);
        msg.guild.channels.create(`${teamname}`, { type: 'text', parent: newcat.id })
          .then(console.log(`Successfully created text channel ${teamname}!`))
          .catch(console.error);
        msg.guild.channels.create(`${teamname}`, { type: 'voice', parent: newcat.id })
          .then(console.log(`Successfully created voice channel ${teamname}!`))
          .catch(console.error);
      } else {
        msg.channel.send(`${user}, this role already exists! Try again.`);
      }
    }
  } else if (msg.content.startsWith('!addmembers')) {
    let myroles = msg.member.roles.cache.array();
    var selectedteam;
    myroles.forEach(function (role) {
      if (role.name != "Verified" && role.name != "PuzzleSoc Exec" && role.name != "@everyone") {
        selectedteam = role.name;
      }
    });
    var newmembers = msg.mentions.members.array();
    newmembers.forEach(function (invitee) {
      if ((invitee.roles.cache.map(roles =>`${roles}`).length > 2 && !invitee.hasPermission("ADMINISTRATOR")) || (invitee.roles.cache.map(roles =>`${roles}`).length > 3 && invitee.hasPermission("ADMINISTRATOR"))) {
        msg.channel.send(`${invitee.tag} is already in a team!`);
      } else if (verifiedUsers[invitee.id].name in Array.from(invites.keys)) {
        msg.channel.send(`${invitee.tag} already has a pending invite, please wait!`); 
      } else {
        invites.set(verifiedUsers[invitee.id].name, selectedteam);
        for (let [key, value] of invites) {
          console.log(key + ' invited to ' + value);
        }
        invitee.send(`You've been invited to ${msg.channel.name}. Type !accept to join the team or !reject to cancel! (Make sure it's on the server.)`);
      }
    });
    msg.channel.send("Invites sent!");
  } else if (msg.content === '!accept') {
    console.log(invites.get(verifiedUsers[msg.author.id].name));
    if (!(invites.has(verifiedUsers[msg.author.id].name))) {
      msg.channel.send(`${user}, you haven't received any invites!`);
    } else if ((msg.member.roles.cache.map(roles =>`${roles}`).length > 2 && !msg.member.hasPermission("ADMINISTRATOR")) || (msg.member.roles.cache.map(roles =>`${roles}`).length > 3 && msg.member.hasPermission("ADMINISTRATOR"))) {
      msg.channel.send(`${user}, you're already in a team!`);
    } else {
      let teamrole = msg.guild.roles.cache.find(x => x.name == invites.get(verifiedUsers[msg.author.id].name));
      msg.member.roles.add(teamrole);
      teams[`${teamrole.name}`].members.push(verifiedUsers[msg.member.id].name);
      invites.delete(verifiedUsers[msg.member.id].name);
      fs.writeFile('./registeredteams.json', JSON.stringify(teams), (err) => {
        if (err) console.error(err);
      });
      msg.channel.send(`${user}, you've been added to ${teamrole.name}`);
    }
  } else if (msg.content === '!reject') {
    msg.author.send("Invite rejected!");
    invites.delete(verifiedUsers[msg.member.id].name);
  } else if (msg.content === '!help') {
    msg.author.send("Commands:\n !verify: Get verified! \n !registerteam <team name>: Create a team named <team name>! \n !addmembers <@user1> <@user2> etc.: Send an invite to @user1, @user2 etc. to join your team. \n !accept/!reject: Accept or reject invitation. Make sure to do this somewhere in the server!");
  } else if (msg.content === '!showroles') {
    let myroles = msg.member.roles.cache.array();
    myroles.forEach(function (role) {
      console.log(role.name);
    });
  } else if (msg.content.startsWith('!finished') && msg.member.hasPermission("ADMINISTRATOR")) {
    let pingedRole = msg.mentions.roles.array();
    let huntfinisher = msg.guild.roles.cache.find(x => x.name == "Hunt Finisher");
    pingedRole.forEach(function (role) {
      var usersofrole = role.members.array();
      usersofrole.forEach(function (roleuser) {
        roleuser.roles.add(huntfinisher);
        msg.channel.send(`${roleuser.displayName} given Hunt Finisher role.`);
      });
    });
  } else if (msg.content.startsWith('!sleep')) {
    var users = msg.mentions.users.array();
    if (users.length == 0) {
      msg.channel.send(``, {files: ["sleep.gif"]});
    } else {
      var string = "";
      for (i = 0; i < users.length; i++) {
        string += users[i] + " ";
      }
      msg.channel.send(string, {files: ["sleep.gif"]});
   }
  } else if (msg.content === '!verify') {
    if (!isVerified && !applying.includes(msg.author.id)) {
      let skip = 0;
      let back = 0;
      applying.push(msg.author.id);
      await msg.author.send("Hiya! I have a few quick questions to ask you so you can get verified! Type in '!cancel' if you would like to stop verifying at any time.");
      if (!verifiedUsers[user.id]) {
        verifiedUsers[user.id] = {
          "tag": user.tag,
          "name": "",
          "email": "",
          "arc": "",
          "zid": "",
          "phone": ""
        }
      }
      let cancel = false;
      for (let i = 0; i < verifQs.length && cancel === false; i++) {
        if (skip === 1) {
          skip = 0;
          continue;
        } else if (back === 1) {
          back = 0;
          i = i - 2;
          continue;
        }
        await msg.author.dmChannel.send(verifQs[i]);
        await msg.author.dmChannel.awaitMessages(m => m.author.id === msg.author.id, { max: 1, time: 300000, errors: ["time"] })
          .then(collected => {
            if (collected.first().content.toLowerCase() === "!cancel") {
              msg.author.send("Verification cancelled! Type in '!verify' to start again!");
              cancel = true;
              delete verifiedUsers[user.id];
              applying.splice(applying.indexOf(msg.author.id), 1);
              console.log(`${msg.author.tag} cancelled their application.`);
            } else if (collected.first().content === "!verify") {
              msg.author.send("You've already started the verification process!");
              back = 1;
            } else {
              if (i == 0) {
                if (collected.first().content.match(/^\w+/)) {
                  verifiedUsers[user.id].name = collected.first().content;
                } else {
                  msg.author.send("Your name can't be empty! Please try again!");
                  back = 1;
                }
              } else if (i == 1) {
                if (collected.first().content.match(/^\w.+@\w+/)) {
                  verifiedUsers[user.id].email = collected.first().content;
                } else {
                  msg.author.send("Your email isn't in the correct format! Please try again!");
                  back = 1;
                }
              } else if (i == 3) {
                if (collected.first().content.match(/^z\d{7}$/)) {
                  skip = 1;
                  verifiedUsers[user.id].zid = collected.first().content;
                } else {
                  msg.author.send("Your zID is not valid! Please try again!");
                  back = 1;
                }
              } else if (i == 2) {
                if (collected.first().content == 'N') {
                  verifiedUsers[user.id].arc = collected.first().content;
                  skip = 1;
                } else if (collected.first().content == 'Y') {
                  verifiedUsers[user.id].arc = collected.first().content;
                } else {
                  msg.author.send("Please format your answer as a 'Y' or an 'N'!");
                  back = 1;
                }
              } else {
                if (collected.first().content.match(/^\d{8}\d?\d?\d?\d?\d?\d?\d?$/)) {
                  verifiedUsers[user.id].phone = collected.first().content;
                } else {
                  msg.author.send("Your number is not valid! Please try again!");
                  i--;
                }
              }
            }
          }).catch(() => {
            msg.author.send("Verification process timed out! Type in '!verify' to start again!");
            cancel = true;
            delete verifiedUsers[user.id];
            applying.splice(applying.indexOf(msg.author.id), 1);
            console.log(`${msg.author.tag} let their application time out.`);
          });
      }
      fs.writeFile('./verification.json', JSON.stringify(verifiedUsers), (err) => {
          if (err) console.error(err);
        });
      if (cancel === false) {
        await msg.author.send("Thanks for filling out the form. You've been successfully verified!");
        const verifiedrole = msg.guild.roles.cache.find(x => x.name == 'Verified');
        msg.member.roles.add(verifiedrole);
        applying.splice(applying.indexOf(msg.author.id), 1);
      }
    } else if (applying.includes(msg.author.id)) {
      await msg.author.send("You've already started the verification process!");
    } else {
      await msg.author.send("You've already been verified!");
    }
  }
});

client.login(auth.token);