import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface WordData {
  word: string;
  hint: string;
  typeHints: string[];
}

interface Player {
  name: string;
  isImposter: boolean;
  word: string;
  imposterTip: string;
}

const wordCategories: Record<string, WordData[]> = {
  "Allgemein": [
    { word: "Apfel", hint: "gesund", typeHints: ["Obst", "Essen", "Frucht", "Baum"] },
    { word: "Zug", hint: "schnell", typeHints: ["Verkehrsmittel", "Fahrzeug", "Reisen", "Öffentlich"] },
    { word: "Lampe", hint: "an der Decke", typeHints: ["Beleuchtung", "Möbel", "Wohnung", "Lichtquelle"] },
    { word: "Ball", hint: "rund", typeHints: ["Sportgerät", "Spielzeug", "Freizeit", "Rund"] },
    { word: "Radio", hint: "man hört es", typeHints: ["Elektronik", "Gerät", "Unterhaltung", "Musik"] },
    { word: "Tisch", hint: "Möbel", typeHints: ["Möbelstück", "Einrichtung", "Zuhause", "Oberfläche"] },
    { word: "Auto", hint: "fährt", typeHints: ["Fahrzeug", "Transportmittel", "Straße", "Motorisiert"] },
    { word: "Handy", hint: "telefonieren", typeHints: ["Elektronik", "Kommunikation", "Mobil", "Bildschirm"] },
    { word: "Hund", hint: "Tier", typeHints: ["Tier", "Haustier", "Säugetier", "Begleiter"] },
    { word: "Katze", hint: "Tier", typeHints: ["Tier", "Haustier", "Säugetier", "Jäger"] },
    { word: "Basketball", hint: "Michael Jordan", typeHints: ["Sport", "Ballspiel", "Mannschaftssport", "Korb"] },
    { word: "Mario", hint: "Nintendo", typeHints: ["Videospiel", "Charakter", "Klempner", "Jump'n'Run"] },
    { word: "Deutschland", hint: "Land", typeHints: ["Land", "Europa", "Nation", "Kultur"] },
    { word: "Pokémon", hint: "Monster", typeHints: ["Spiel", "Sammeln", "Anime", "Fantasy"] },
    { word: "Minecraft", hint: "8 Ecken", typeHints: ["Spiel", "Bauen", "Sandbox", "Blöcke"] },
  ],
  "Natur": [
    { word: "Baum", hint: "draußen", typeHints: ["Pflanze", "Wald", "Holz", "Grün"] },
    { word: "Fluss", hint: "Wasser", typeHints: ["Gewässer", "Natur", "Strömung", "Landschaft"] },
    { word: "Vogel", hint: "flight", typeHints: ["Tier", "Fliegen", "Feder", "Luft"] },
    { word: "Blume", hint: "im Garten", typeHints: ["Pflanze", "Blüte", "Farbe", "Duft"] },
    { word: "Wolke", hint: "oben", typeHints: ["Wetter", "Himmel", "Wasser", "Form"] },
    { word: "Berg", hint: "groß", typeHints: ["Landschaft", "Gebirge", "Gipfel", "Natur"] },
    { word: "Sonne", hint: "Tag", typeHints: ["Himmelskörper", "Licht", "Wärme", "Stern"] },
    { word: "Mond", hint: "Nacht", typeHints: ["Himmelskörper", "Nachthimmel", "Erdtrabant", "Phasen"] },
    { word: "Regen", hint: "Wasser", typeHints: ["Wetter", "Niederschlag", "Wolken", "Nass"] },
    { word: "Stein", hint: "hart", typeHints: ["Material", "Fels", "Mineral", "Geologie"] },
  ],
  "Sport": [
    { word: "Fußball", hint: "berühmt", typeHints: ["Sportart", "Ballspiel", "Mannschaftssport", "Stadion"] },
    { word: "Basketball", hint: "Michael Jordan", typeHints: ["Sport", "Ballspiel", "Mannschaftssport", "Korb"] },
    { word: "Tennis", hint: "Sport", typeHints: ["Sportart", "Rückschlagspiel", "Schläger", "Feld"] },
    { word: "Schwimmen", hint: "im Wasser", typeHints: ["Sportart", "Wasser", "Bewegung", "Pool"] },
    { word: "Golf", hint: "kleiner Ball", typeHints: ["Sport", "Ballspiel", "Schläger", "Platz"] },
  ]
};

const ImposterGame: React.FC = () => {
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'reveal'>('setup');
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [playerCount, setPlayerCount] = useState(4);
  const [imposterCount, setImposterCount] = useState(1);
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Allgemein');
  const [wordData, setWordData] = useState<WordData | null>(null);
  const [imposterIndices, setImposterIndices] = useState<number[]>([]);
  const [showTrollButton, setShowTrollButton] = useState(false);
  const [usedWords, setUsedWords] = useState<Record<string, string[]>>({});
  const [showPlayerWord, setShowPlayerWord] = useState(false);

  // Add "Alle Wörter" category
  useEffect(() => {
    const allWords: WordData[] = [];
    Object.keys(wordCategories).forEach(category => {
      if (category !== "Alle Wörter") {
        allWords.push(...wordCategories[category]);
      }
    });
    wordCategories["Alle Wörter"] = allWords;
  }, []);

  // Load saved data from localStorage
  useEffect(() => {
    const savedUsedWords = localStorage.getItem('usedWords');
    if (savedUsedWords) {
      setUsedWords(JSON.parse(savedUsedWords));
    }

    const savedNames = localStorage.getItem('playerNames');
    if (savedNames) {
      const names = JSON.parse(savedNames);
      setPlayerNames(names);
      setPlayerCount(names.length);
    }

    const savedCategory = localStorage.getItem('lastSelectedCategory');
    if (savedCategory) {
      setSelectedCategory(savedCategory);
    }
  }, []);

  const saveUsedWords = (words: Record<string, string[]>) => {
    localStorage.setItem('usedWords', JSON.stringify(words));
  };

  const savePlayerNames = (names: string[]) => {
    localStorage.setItem('playerNames', JSON.stringify(names));
  };

  const saveSelectedCategory = (category: string) => {
    localStorage.setItem('lastSelectedCategory', category);
  };

  const getRandomWord = (category: string): WordData | null => {
    const wordsInCat = wordCategories[category];
    if (!wordsInCat || wordsInCat.length === 0) return null;

    let availableWords = wordsInCat.filter(w => !(usedWords[category] && usedWords[category].includes(w.word)));

    if (availableWords.length === 0) {
      const newUsedWords = { ...usedWords, [category]: [] };
      setUsedWords(newUsedWords);
      saveUsedWords(newUsedWords);
      availableWords = [...wordsInCat];
    }

    const randomIndex = Math.floor(Math.random() * availableWords.length);
    const selectedWord = availableWords[randomIndex];

    const newUsedWords = {
      ...usedWords,
      [category]: [...(usedWords[category] || []), selectedWord.word]
    };
    setUsedWords(newUsedWords);
    saveUsedWords(newUsedWords);

    return selectedWord;
  };

  const createNameInputs = () => {
    if (playerCount < 3) {
      alert("Mindestens 3 Spieler nötig!");
      return;
    }
    const newNames = Array(playerCount).fill('').map((_, i) => 
      playerNames[i] || `Spieler ${i + 1}`
    );
    setPlayerNames(newNames);
  };

  const updatePlayerName = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const startGame = (useLastPlayers = false) => {
    let currentPlayerNames = useLastPlayers && playerNames.length > 0 
      ? playerNames 
      : playerNames.map((name, i) => name.trim() || `Spieler ${i + 1}`);

    if (currentPlayerNames.length < 3) {
      alert("Mindestens 3 Spieler nötig!");
      return;
    }

    const newPlayers: Player[] = currentPlayerNames.map(name => ({
      name,
      isImposter: false,
      word: "",
      imposterTip: ""
    }));

    savePlayerNames(currentPlayerNames);
    saveSelectedCategory(selectedCategory);

    const word = getRandomWord(selectedCategory);
    if (!word) {
      alert("Keine Wörter für das ausgewählte Thema gefunden!");
      return;
    }

    setWordData(word);

    // Select random imposters
    const maxImposters = Math.min(4, Math.floor(newPlayers.length / 2));
    const actualImposterCount = Math.min(imposterCount, maxImposters);
    
    const playerIndices = Array.from({length: newPlayers.length}, (_, i) => i);
    const newImposterIndices: number[] = [];
    
    for (let i = 0; i < actualImposterCount; i++) {
      const randomIndex = Math.floor(Math.random() * playerIndices.length);
      newImposterIndices.push(playerIndices.splice(randomIndex, 1)[0]);
    }

    setImposterIndices(newImposterIndices);

    // Assign words and tips
    const specificTips = [...(word.typeHints || [])];
    for (let i = specificTips.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [specificTips[i], specificTips[j]] = [specificTips[j], specificTips[i]];
    }

    newPlayers.forEach((player, i) => {
      player.isImposter = newImposterIndices.includes(i);
      player.word = player.isImposter ? "???" : word.word;
      if (player.isImposter) {
        player.imposterTip = specificTips.shift() || "Geheimnis";
      }
    });

    setPlayers(newPlayers);
    setCurrentPlayerIndex(0);
    setGameState('playing');
    setShowPlayerWord(false);
  };

  const showCurrentPlayer = () => {
    setShowPlayerWord(true);
  };

  const nextPlayer = () => {
    if (currentPlayerIndex < players.length - 1) {
      setCurrentPlayerIndex(currentPlayerIndex + 1);
      setShowPlayerWord(false);
    } else {
      // All players have seen their words
      setGameState('reveal');
    }
  };

  const resetGame = () => {
    setGameState('setup');
    setPlayers([]);
    setCurrentPlayerIndex(0);
    setShowPlayerWord(false);
    setShowTrollButton(false);
  };

  const openWikipedia = () => {
    window.open("https://de.wikipedia.org/wiki/Wikipedia:Hauptseite", "_blank");
  };

  const maxImposters = Math.min(4, Math.floor(playerCount / 2));

  return (
    <div className="min-h-screen font-poppins text-[color:hsl(var(--game-text))]" 
         style={{ background: 'var(--gradient-game-bg)' }}>
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,hsla(var(--game-accent),0.15)_0%,transparent_25%),radial-gradient(circle_at_80%_70%,hsla(var(--game-secondary),0.15)_0%,transparent_25%)] pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 
            className="text-4xl md:text-6xl font-game font-bold mb-4 cursor-pointer"
            style={{ 
              background: 'var(--gradient-game-title)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'pulsateGlow 2.5s infinite alternate'
            }}
            onClick={() => setShowTrollButton(true)}
          >
            🎮 IMPOSTER SPLASH
          </h1>
          <Button 
            onClick={openWikipedia}
            className="absolute top-4 right-4 md:static md:mt-4"
            style={{ background: 'linear-gradient(45deg, #007bff 0%, #0056b3 100%)' }}
          >
            Wikipedia
          </Button>
        </div>

        {/* Setup Phase */}
        {gameState === 'setup' && (
          <div className="w-full max-w-lg">
            <div 
              className="relative overflow-hidden rounded-3xl p-8 backdrop-blur-md game-card-shine"
              style={{ 
                background: 'hsla(var(--game-card-bg), 0.8)',
                border: '2px solid hsl(var(--game-border))',
                boxShadow: 'var(--game-card-shadow)'
              }}
            >
              <div className="space-y-6 text-center">
                <div>
                  <label className="block text-lg mb-2">Wie viele Spieler?</label>
                  <Input
                    type="number"
                    min="3"
                    max="20"
                    value={playerCount}
                    onChange={(e) => setPlayerCount(parseInt(e.target.value) || 4)}
                    className="text-center text-lg"
                    style={{ 
                      background: 'hsla(var(--game-input-bg), 0.7)',
                      border: '2px solid hsl(var(--game-border))',
                      color: 'hsl(var(--game-text))'
                    }}
                  />
                </div>

                <Button 
                  onClick={createNameInputs}
                  style={{ background: 'var(--gradient-button-primary)' }}
                >
                  Namen eingeben
                </Button>

                {playerNames.length > 0 && (
                  <div className="space-y-3">
                    {playerNames.map((name, index) => (
                      <Input
                        key={index}
                        placeholder={`Name Spieler ${index + 1}`}
                        value={name}
                        onChange={(e) => updatePlayerName(index, e.target.value)}
                        className="text-center"
                        style={{ 
                          background: 'hsla(var(--game-input-bg), 0.7)',
                          border: '2px solid hsl(var(--game-border))',
                          color: 'hsl(var(--game-text))'
                        }}
                      />
                    ))}
                  </div>
                )}

                <div>
                  <label className="block text-lg mb-2">Wie viele Imposter?</label>
                  <Input
                    type="number"
                    min="1"
                    max={maxImposters}
                    value={imposterCount}
                    onChange={(e) => setImposterCount(Math.min(parseInt(e.target.value) || 1, maxImposters))}
                    className="text-center text-lg"
                    style={{ 
                      background: 'hsla(var(--game-input-bg), 0.7)',
                      border: '2px solid hsl(var(--game-border))',
                      color: 'hsl(var(--game-text))'
                    }}
                  />
                </div>

                <div>
                  <label className="block text-lg mb-2">Wähle ein Thema:</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger 
                      className="text-center text-lg"
                      style={{ 
                        background: 'hsla(var(--game-input-bg), 0.7)',
                        border: '2px solid hsl(var(--game-border))',
                        color: 'hsl(var(--game-text))'
                      }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(wordCategories).map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {playerNames.length >= 3 && (
                  <div className="flex gap-4">
                    <Button 
                      onClick={() => startGame(false)}
                      className="flex-1"
                      style={{ background: 'var(--gradient-button-primary)' }}
                    >
                      Spiel starten
                    </Button>
                    <Button 
                      onClick={() => startGame(true)}
                      className="flex-1"
                      style={{ background: 'var(--gradient-button-success)' }}
                    >
                      🚀 Schneller Start
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Playing Phase */}
        {gameState === 'playing' && (
          <div className="w-full max-w-lg">
            <div 
              className="relative overflow-hidden rounded-3xl p-8 backdrop-blur-md"
              style={{ 
                background: 'hsla(var(--game-card-bg), 0.8)',
                border: '2px solid hsl(var(--game-border))',
                boxShadow: 'var(--game-card-shadow)'
              }}
            >
              <div className="text-center space-y-6">
                {!showPlayerWord ? (
                  <>
                    <h2 className="text-2xl font-bold">
                      Gerät an <span style={{ color: 'hsl(var(--game-accent))' }}>
                        {players[currentPlayerIndex]?.name}
                      </span> übergeben
                    </h2>
                    <Button 
                      onClick={showCurrentPlayer}
                      className="w-full text-lg py-4"
                      style={{ background: 'var(--gradient-button-primary)' }}
                    >
                      Wort anzeigen
                    </Button>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold" style={{ color: 'hsl(var(--game-accent))' }}>
                      {players[currentPlayerIndex]?.name}
                    </h2>
                    
                    {players[currentPlayerIndex]?.isImposter ? (
                      <div className="space-y-4">
                        <p className="text-xl">
                          Du bist der <span 
                            className="font-bold text-2xl"
                            style={{ color: 'hsl(var(--game-imposter))' }}
                          >
                            IMPOSTER
                          </span>!
                        </p>
                        <p className="text-lg">
                          Dein Tipp zum Wort: <em style={{ color: 'hsl(var(--game-reveal))' }}>
                            "{players[currentPlayerIndex]?.imposterTip}"
                          </em>
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-lg">Dein Wort ist:</p>
                        <h3 className="text-3xl font-bold" style={{ color: 'hsl(var(--game-accent))' }}>
                          {players[currentPlayerIndex]?.word}
                        </h3>
                      </div>
                    )}
                    
                    <p className="text-lg">Merke es dir!</p>
                    
                    <Button 
                      onClick={nextPlayer}
                      className="w-full text-lg py-4"
                      style={{ background: 'var(--gradient-button-primary)' }}
                    >
                      {currentPlayerIndex < players.length - 1 ? 'Nächster Spieler' : 'Zur Diskussion'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reveal Phase */}
        {gameState === 'reveal' && wordData && (
          <div className="w-full max-w-lg">
            <div 
              className="relative overflow-hidden rounded-3xl p-8 backdrop-blur-md"
              style={{ 
                background: 'hsla(var(--game-card-bg), 0.8)',
                border: '2px solid hsl(var(--game-border))',
                boxShadow: 'var(--game-card-shadow)'
              }}
            >
              <div className="text-center space-y-6">
                <h2 className="text-2xl font-bold" style={{ color: 'hsl(var(--game-accent))' }}>
                  🔍 Die Wahrheit kommt ans Licht!
                </h2>
                
                <div className="space-y-4">
                  <p className="text-lg">
                    Das geheime Wort war: <strong className="text-xl" style={{ color: 'hsl(var(--game-accent))' }}>
                      {wordData.word}
                    </strong>
                  </p>
                  
                  <p className="text-lg">
                    Der allgemeine Hinweis: "<em style={{ color: 'hsl(var(--game-reveal))' }}>
                      {wordData.hint}
                    </em>"
                  </p>
                  
                  <p className="text-lg">
                    {imposterIndices.length > 1 ? 'Die' : 'Der'} <span 
                      className="font-bold text-xl"
                      style={{ color: 'hsl(var(--game-imposter))' }}
                    >
                      IMPOSTER
                    </span> {imposterIndices.length > 1 ? 'waren' : 'war'}: <strong>
                      {imposterIndices.map(index => players[index]?.name).join(', ')}
                    </strong>
                  </p>
                </div>

                <div className="flex gap-4">
                  <Button 
                    onClick={resetGame}
                    className="flex-1"
                    style={{ background: 'var(--gradient-button-restart)' }}
                  >
                    🔄 Neues Spiel
                  </Button>
                  <Button 
                    onClick={() => startGame(true)}
                    className="flex-1"
                    style={{ background: 'var(--gradient-button-success)' }}
                  >
                    🚀 Schneller Start
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Troll Button */}
        {showTrollButton && gameState === 'setup' && (
          <Button
            onClick={() => alert("😈 Troll-Feature wird noch entwickelt!")}
            className="fixed bottom-6 right-6 animate-pulse"
            style={{ 
              background: 'var(--gradient-button-troll)',
              animation: 'pulse 2s infinite'
            }}
          >
            😈 Imposter wählen
          </Button>
        )}
      </div>
    </div>
  );
};

export default ImposterGame;