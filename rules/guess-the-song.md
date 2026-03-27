# Guess the song

This game is based on the idea of a group of people sitting together, taking turns picking a song, letting the others guess, and then letting the next person pick a new song and so on.

## Game flow

### Lobby

All players join and select a name.
A host/owner/admin will choose when to start. Note: the host/admin/owner does not need to be a player in this game, but will most likely be a TV or similar that all players can see. This is also when the owner/host can set `config`.

### Picking a song

A player who has not chosen a song this `round` is randomly selected to pick a song. All other players are waiting for this person to pick a song. The person will search spotify for a song and select it, confirm the selection, where they can also choose where in the song the music should start.

### Guessing

This will start a timer for all players that the guessing phase is coming up, while the owner loads the song and sets up the device.
All participants (excluding the picker) gets a spotify search bar available on their screen.
The owner will start playing the song on their device.
Participants will send click a song they find in their search bar to make a guess, receiving `points` for a correct song, artist and how fast they guessed.

This phase will conclude when the `config`-ured `guess-time` is up or all participants have made their guesses.

### Scoreboard

After the picking phase, a scoreboard showing the correct song, the points gained this turn and the total score should be visible for a short time.

### Next picker

The game moves on by going to Picking a song again with a new picker. The other participants can stay on the Scoreboard until it is time to guess again.

### The end of the game

In the `config` it should be possible to define a number of rounds or duration, when either of these are hit, the game should end and stay on scoreboard without moving on to next picker.
