// Function to save data to local storage
function saveToLocalStorage(key, data) {
  try {
      const jsonData = JSON.stringify(data);
      localStorage.setItem(key, jsonData);
  } catch (error) {
      console.error('Error saving to local storage', error);
  }
}

// Function to load data from local storage
function loadFromLocalStorage(key) {
  try {
      const jsonData = localStorage.getItem(key);
      return jsonData ? JSON.parse(jsonData) : null;
  } catch (error) {
      console.error('Error loading from local storage', error);
      return null;
  }
}

window.onload = function() {
// Загрузка файла data.json
fetch('data.json')
  .then(response => response.json())
  .then(dataReady)
  .catch(error => {
    console.error('Ошибка при загрузке файла:', error);
  });
};

// Ваша функция, которую нужно вызвать
function dataReady(data) {
    let boss = {};
    let dino = {};
    let strategy = {
        boss: {},
        team: [
            {},
            {},
            {},
            {},
        ],
        turn: [
            [0, 0, 0, 0],
        ],
    };
    
    function strategyToText(strategy) {
        let result = "";
        let n = 0; 
        if (!strategy.boss.paleo_id)
            return "";
        strategy.team.forEach((member, index) => {
            if (member.paleo_id)
                ++n;
        });
        if (n === 0)
            return "";
        result += `${boss[strategy.boss.paleo_id].name.slice(0, -5)}\n`;
        result += `${n} 0\n`;
        strategy.team.forEach((member, index) => {
            if (!member.paleo_id)
                return;
            result += `${dino[member.paleo_id].name} ${member.level} ${member.health} ${member.damage} ${member.speed}`;
            if (dino[member.paleo_id].raryty === "omega")
                result += `${member.omega_health} ${member.omega_damage} ${member.omega_speed} ${member.omega_armor} ${member.omega_crit_chance} ${member.omega_crit_factor}`;
            result += '\n';
        });
        strategy.turn.forEach((turn) => {
            strategy.team.forEach((member, index) => {
                if (!member.paleo_id)
                    return;
                result += `${turn[index]} `;
            });
            result += '\n';
        });
        return result;
    }

    data.boss.forEach((_boss, index) => {
      boss[_boss.paleo_id] = _boss;
      _boss.index = index;
    });

    data.dino.forEach((_dino, index) => {
      dino[_dino.paleo_id] = _dino;
      _dino.index = index;
    });

    // Получаем ссылку на элемент <select>
    const bossSelect = document.getElementById('boss-select'); // Замените 'bossSelect' на ID вашего элемента

    // Проходим по списку боссов и добавляем их в <select>
    data.boss.forEach(boss => {
        const option = document.createElement('option');
        option.value = boss.paleo_id;
        option.textContent = boss.name;
        bossSelect.appendChild(option);
    });

    function updateBossImage(bossElement, paleo_id) {
        const bossImage = bossElement.querySelector(`img.creature.boss`);
        const minionImage = bossElement.querySelectorAll(`img.creature.minion`);
        if (paleo_id) {
            bossImage.src = `https://cdn.paleo.gg/games/jwa/images/creature/${paleo_id}.png`;
            if (boss[paleo_id].minions.length) {
                minionImage.forEach((image, index) => {
                    image.src = `https://cdn.paleo.gg/games/jwa/images/creature/${boss[paleo_id].minions[index].paleo_id}.png`;
                    image.style.display = 'inline-block';
                });
            }
        } else {
            bossImage.src = 'creature.png';
            minionImage.forEach((image) => {
                image.src = 'creature.png';
                image.style.display = 'none';
            });
        }    
    }
    
    const bossElement = document.querySelector('div.boss');

    // Добавляем обработчик события 'change'
    bossSelect.addEventListener('change', function() {
        // Получаем выбранный пункт
        const paleo_id = bossSelect.options[bossSelect.selectedIndex].value;
        strategy.boss.paleo_id = paleo_id;
        updateBossImage(bossElement, paleo_id);
    });

    function updateDinoImage(image, paleo_id) {
        if (paleo_id) {
            image.src = `https://cdn.paleo.gg/games/jwa/images/creature/${paleo_id}.png`;
        } else {
            image.src = 'creature.png';
        }
    }

    function updateAbilityImage(abilityElement, paleo_id, ability_index) {
        const imageElement = abilityElement.querySelector('img.ability');
        const priorityElement = abilityElement.querySelector('img.priority');
        const actlastElement = abilityElement.querySelector('img.act-last');
        const preciseElement = abilityElement.querySelector('img.precise');
        const alertElement = abilityElement.querySelector('img.alert');
        const revengeElement = abilityElement.querySelector('img.revenge');

        if (paleo_id in dino && ability_index) {
            const imageUrl = `https://cdn.paleo.gg/games${dino[paleo_id].abilities[ability_index-1].icon}`;
            imageElement.src = imageUrl;
            if (dino[paleo_id].abilities[ability_index-1].priority == 1)
              priorityElement.style.removeProperty('display');
            else
              priorityElement.style.display = 'none';
            if (dino[paleo_id].abilities[ability_index-1].priority == -1)
              actlastElement.style.removeProperty('display');
            else
              actlastElement.style.display = 'none';
            if (dino[paleo_id].abilities[ability_index-1].precise)
              preciseElement.style.removeProperty('display');
            else
              preciseElement.style.display = 'none';
            if (dino[paleo_id].abilities[ability_index-1].alert)
              alertElement.style.removeProperty('display');
            else
              alertElement.style.display = 'none';
            if (dino[paleo_id].abilities[ability_index-1].revenge)
              revengeElement.style.removeProperty('display');
            else
              revengeElement.style.display = 'none';
        } else {
            imageElement.src = 'ability.png';
            priorityElement.style.display = 'none';
            actlastElement.style.display = 'none';
            preciseElement.style.display = 'none';
            alertElement.style.display = 'none';
            revengeElement.style.display = 'none';
        }
    }

    const dinoDialog = document.getElementById('dinoDialog');
    const dinoDialogSelect = dinoDialog.querySelector('select.creature');
    const dinoDialogImage = dinoDialog.querySelector('img.creature');
    const dinoDialogOkButton = dinoDialog.querySelector('button.ok');
    const dinoDialogCancelButton = dinoDialog.querySelector('button.cancel');
    data.dino.forEach((dino) => {
        const option = document.createElement("option");
        option.value = dino.paleo_id;
        option.textContent = dino.name;
        dinoDialogSelect.appendChild(option);
    });
    
    dinoDialogSelect.addEventListener('change', function() {
        // Получаем список способностей для выбранного динозавра
        const paleo_id = this.options[this.selectedIndex].value;
        const omegaParams = dinoDialog.querySelector('div.omega');
        if (paleo_id in dino && dino[paleo_id].rarity == "omega") {
            omegaParams.style.removeProperty('display');
        } else {
            omegaParams.style.display = 'none';
        }

        updateDinoImage(dinoDialogImage, paleo_id);
    });

    // Найти все элементы select с классом "team"
    const dinoImage = document.querySelectorAll("img.team");

    dinoImage.forEach((image, dino_index) => {
        image.addEventListener('click', function() {
            var dinoDialogOkButtonClick = function() {
                let paleo_id = dinoDialogSelect.options[dinoDialogSelect.selectedIndex].value;
                let dino_params = {
                    paleo_id: paleo_id,
                    level: parseInt(dinoDialog.querySelector('input.level').value),
                    health: parseInt(dinoDialog.querySelector('input.health').value),
                    damage: parseInt(dinoDialog.querySelector('input.damage').value),
                    speed: parseInt(dinoDialog.querySelector('input.speed').value),
                };
                if (paleo_id in dino && dino[paleo_id].rarity == "omega") {
                    dino_params.omega_health = parseInt(dinoDialog.querySelector('input.omega_health').value);
                    dino_params.omega_damage = parseInt(dinoDialog.querySelector('input.omega_damage').value);
                    dino_params.omega_speed = parseInt(dinoDialog.querySelector('input.omega_speed').value);
                    dino_params.omega_armor = parseInt(dinoDialog.querySelector('input.omega_armor').value);
                    dino_params.omega_crit_chance = parseInt(dinoDialog.querySelector('input.omega_crit_chance').value);
                    dino_params.omega_crit_factor = parseInt(dinoDialog.querySelector('input.omega_crit_factor').value);
                }
                if (strategy.team[dino_index].paleo_id != paleo_id) {
                    updateDinoImage(image, paleo_id);
                    const turnElements = abilitiesContainer.querySelectorAll('div.turn');
                    strategy.turn.forEach((turn, turn_index) => {
                        turn[dino_index] = 0;
                        const abilityElement = turnElements[turn_index].querySelectorAll('div.ability')[dino_index];
                        updateAbilityImage(abilityElement, paleo_id, 0);
                    })
                }
                strategy.team[dino_index] = dino_params;
                dinoDialogCancelButtonClick();
            }
            var dinoDialogCancelButtonClick = function() {
                dinoDialogOkButton.removeEventListener('click', dinoDialogOkButtonClick);
                dinoDialogCancelButton.removeEventListener('click', dinoDialogCancelButtonClick);
                dinoDialog.close();
            }
            dinoDialogOkButton.addEventListener('click', dinoDialogOkButtonClick);
            dinoDialogCancelButton.addEventListener('click', dinoDialogCancelButtonClick);

            let paleo_id = strategy.team[dino_index].paleo_id;
            if (paleo_id in dino)
                dinoDialogSelect.selectedIndex = dino[paleo_id].index + 1;
            else
                dinoDialogSelect.selectedIndex = 0;
            const event = new Event('change', { bubbles: true });
            dinoDialogSelect.dispatchEvent(event);

            dinoDialog.querySelector('input.level').value = strategy.team[dino_index].level || 0;
            dinoDialog.querySelector('input.health').value = strategy.team[dino_index].health || 0;
            dinoDialog.querySelector('input.damage').value = strategy.team[dino_index].damage || 0;
            dinoDialog.querySelector('input.speed').value = strategy.team[dino_index].speed || 0;

            dinoDialog.querySelector('input.omega_health').value = strategy.team[dino_index].omega_health || 0;
            dinoDialog.querySelector('input.omega_damage').value = strategy.team[dino_index].omega_damage || 0;
            dinoDialog.querySelector('input.omega_speed').value = strategy.team[dino_index].omega_speed || 0;
            dinoDialog.querySelector('input.omega_armor').value = strategy.team[dino_index].omega_armor || 0;
            dinoDialog.querySelector('input.omega_crit_chance').value = strategy.team[dino_index].omega_crit_chance || 0;
            dinoDialog.querySelector('input.omega_crit_factor').value = strategy.team[dino_index].omega_crit_factor || 0;
            
            dinoDialog.showModal();
        });
    });
    
    const abilityDialog = document.getElementById('abilityDialog');
    const abilityDialogSelect = abilityDialog.querySelector('select.ability');
    const abilityDialogElement = abilityDialog.querySelector('div.ability');
    const abilityDialogOkButton = abilityDialog.querySelector('button.ok');
    const abilityDialogCancelButton = abilityDialog.querySelector('button.cancel');

    function initTurn(turnElement, turn_index) {
        const abilityElements = turnElement.querySelectorAll('div.ability');
        abilityElements.forEach((ability, dino_index) => {
            updateAbilityImage(ability);
            
            ability.addEventListener('click', function() {
                var abilityDialogSelectChange = function() {
                    const paleo_id = strategy.team[dino_index].paleo_id;
                    let ability_index = +abilityDialogSelect[abilityDialogSelect.selectedIndex].value;
                    updateAbilityImage(abilityDialogElement, paleo_id, ability_index);
                }
                var abilityDialogOkButtonClick = function() {
                    const paleo_id = strategy.team[dino_index].paleo_id;
                    let ability_index = +abilityDialogSelect[abilityDialogSelect.selectedIndex].value;
                    
                    strategy.turn[turn_index][dino_index] = ability_index;
                    
                    updateAbilityImage(ability, paleo_id, ability_index);

                    abilityDialogCancelButtonClick();
                }
                var abilityDialogCancelButtonClick = function() {
                    abilityDialogSelect.removeEventListener('change', abilityDialogSelectChange);
                    abilityDialogOkButton.removeEventListener('click', abilityDialogOkButtonClick);
                    abilityDialogCancelButton.removeEventListener('click', abilityDialogCancelButtonClick);                    
                    abilityDialog.close();
                }
                abilityDialogSelect.addEventListener('change', abilityDialogSelectChange);
                abilityDialogOkButton.addEventListener('click', abilityDialogOkButtonClick);
                abilityDialogCancelButton.addEventListener('click', abilityDialogCancelButtonClick);

                while (abilityDialogSelect.options.length > 1) {
                    abilityDialogSelect.remove(1);
                }

                let paleo_id = strategy.team[dino_index].paleo_id;

                if (paleo_id in dino) {
                    const abilities = dino[paleo_id].abilities;

                    abilities.forEach((ability, index) => {
                        const option = document.createElement('option');
                        option.value = index + 1;
                        option.textContent = ability.name;
                        abilityDialogSelect.appendChild(option.cloneNode(true));
                    });
                    
                    abilityDialogSelect.selectedIndex = strategy.turn[turn_index][dino_index];
                    const event = new Event('change', { bubbles: true });
                    abilityDialogSelect.dispatchEvent(event);

                    abilityDialog.showModal();
                }
            });
        });
    }

    const abilitiesContainer = document.getElementById('abilities-container');
    const firstTurn = abilitiesContainer.querySelector('div.turn:first-child');
    
    initTurn(firstTurn, 0);

    const addButton = document.getElementById('add');

    addButton.addEventListener('click', function() {
      const newTurn = firstTurn.cloneNode(true);
      
      const turn_index = strategy.turn.length;
      
      strategy.turn.push([0, 0, 0, 0]);

      initTurn(newTurn, turn_index);
      
      // Добавляем копию в конец контейнера
      abilitiesContainer.appendChild(newTurn);
    });

    const removeButton = document.getElementById('remove');

    removeButton.addEventListener('click', function() {
      if (strategy.turn.length >= 2) {
        strategy.turn.pop();
        const lastTurn = abilitiesContainer.querySelector('div.turn:last-child');
        abilitiesContainer.removeChild(lastTurn);
      }
    });

    let worker;

    const consoleElement = document.getElementById('console');
    const runButton = document.getElementById('run');
    
    function start() {
        runButton.innerHTML = 'Stop';
        consoleElement.innerHTML = '';

        let strat = strategyToText(strategy);
        console.log(strat);
                    
        worker = new Worker('worker.js');
      
        // Обработчик сообщений от Web Worker
        worker.onmessage = (event) => {
            const result = event.data;
            if (result.type == "output") {
                consoleElement.innerHTML += result.data + "\n";
            } else if (result.type == "done") {
                stop();
            }
        };
        
        worker.postMessage({
            commandLine: "JWAcalc --check --loglevel 4",
            input: strat,
        });
    }
    
    function stop() {
        runButton.innerHTML = 'Run';
        worker.terminate();
        worker = undefined;
    }
    
    runButton.addEventListener('click', function() {
        console.log(worker);
        if (!worker)
            start();
        else
            stop();
    });
}
