// ========================================================================
// --- LÓGICA DE JUEGOS (games.js) ---
// Versión 5.1 - Se añade soporte para efectos de sonido
// ========================================================================

const GameUtils = {
    parseText: (s) => s.match(/^(.*?)<(.*?)>$/) ? {t: s.match(/^(.*?)<(.*?)>$/)[1].trim(), s: s.match(/^(.*?)<(.*?)>$/)[2].trim()} : {t: s.trim(), s: ''},
    shuffleArray: (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
};

/**
 * Módulo para el juego de Oraciones Desordenadas (Jumbled Sentences).
 */
const JumbledSentencesGame = {
    state: null,
    elements: {},
    dependencies: {},

    init(gameData, storyGlossary, storyId, dependencies) {
        this.dependencies = dependencies;
        this.state = {
            sentences: gameData.it.map(s => GameUtils.parseText(s)),
            currentIndex: 0,
            totalSentences: gameData.it.length,
            glossary: storyGlossary,
            storyId: storyId,
            gameId: gameData.id,
            correctAnswers: 0,
            errors: 0,
        };
        this.elements = {
            view: document.getElementById('game-view'), 
            area: document.getElementById('game-area'), 
            title: document.getElementById('game-view-title'),
            subtitle: document.getElementById('game-view-subtitle'), 
            scoreDisplay: document.getElementById('game-score-display'),
        };
        const { t: title, s: subtitle } = GameUtils.parseText(gameData.t);
        this.elements.title.textContent = title;
        this.elements.subtitle.textContent = subtitle;
        this.loadSentence(0);
        this.updateScore();
    },

    loadSentence(index) {
        if (!this.state) return;
        this.elements.area.innerHTML = '';
        const template = document.getElementById('jumbled-sentence-template');
        this.elements.area.appendChild(template.content.cloneNode(true));
        const sentenceData = this.state.sentences[index];
        const words = sentenceData.t.split(' ');
        const shuffledWords = GameUtils.shuffleArray([...words]);
        const wordBank = this.elements.area.querySelector('#jumbled-word-bank');
        const dropZone = this.elements.area.querySelector('#jumbled-drop-zone');
        shuffledWords.forEach((word, i) => {
            const wordEl = document.createElement('div');
            wordEl.textContent = word; wordEl.className = 'word-draggable'; wordEl.draggable = true; wordEl.id = `drag-${i}`;
            wordEl.addEventListener('dragstart', (e) => this.handleDragStart(e));
            wordEl.addEventListener('dragend', (e) => e.target.classList.remove('dragging'));
            wordEl.addEventListener('click', (e) => this.handleWordClick(e));
            wordBank.appendChild(wordEl);
        });
        dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
        dropZone.addEventListener('dragleave', (e) => e.currentTarget.classList.remove('drag-over'));
        dropZone.addEventListener('drop', (e) => this.handleDrop(e));
        this.elements.area.querySelector('#jumbled-check-btn').onclick = () => this.checkAnswer();
        this.elements.area.querySelector('#jumbled-next-btn').onclick = () => this.nextSentence();
        this.elements.area.querySelector('#jumbled-progress').textContent = `Oración ${index + 1} de ${this.state.totalSentences}`;
    },

    handleDragStart(e) { if (!this.state) return; e.dataTransfer.setData('text/plain', e.target.id); e.target.classList.add('dragging'); },
    handleDragOver(e) { if (!this.state) return; e.preventDefault(); e.currentTarget.classList.add('drag-over'); },
    handleDrop(e) {
        if (!this.state) return;
        e.preventDefault();
        this.dependencies.playSound('click');
        const id = e.dataTransfer.getData('text/plain');
        const draggable = document.getElementById(id);
        const dropZone = e.currentTarget;
        if (draggable && dropZone.id === 'jumbled-drop-zone') { dropZone.appendChild(draggable); }
        dropZone.classList.remove('drag-over');
        const wordBank = this.elements.area.querySelector('#jumbled-word-bank');
        const checkBtn = this.elements.area.querySelector('#jumbled-check-btn');
        checkBtn.disabled = wordBank.children.length > 0;
    },

    handleWordClick(e) {
        if (!this.state) return;
        this.dependencies.playSound('click');
        const wordEl = e.currentTarget;
        const wordBank = this.elements.area.querySelector('#jumbled-word-bank');
        const dropZone = this.elements.area.querySelector('#jumbled-drop-zone');
        const checkBtn = this.elements.area.querySelector('#jumbled-check-btn');
        if (wordEl.classList.contains('correct')) { return; }
        if (wordEl.parentNode.id === 'jumbled-word-bank') { dropZone.appendChild(wordEl); } else { wordBank.appendChild(wordEl); }
        checkBtn.disabled = wordBank.children.length > 0;
    },

    checkAnswer() {
        if (!this.state) return;
        const dropZone = this.elements.area.querySelector('#jumbled-drop-zone');
        const feedbackEl = this.elements.area.querySelector('#jumbled-feedback');
        const checkBtn = this.elements.area.querySelector('#jumbled-check-btn');
        const nextBtn = this.elements.area.querySelector('#jumbled-next-btn');
        const words = Array.from(dropZone.children).map(el => el.textContent.split('\n')[0]);
        const userAnswer = words.join(' ');
        const correctAnswer = this.state.sentences[this.state.currentIndex].t;
        if (userAnswer === correctAnswer) {
            this.dependencies.playSound('ok');
            this.state.correctAnswers++; this.updateScore();
            feedbackEl.innerHTML = `<span class="text-green-400 font-bold text-lg animate-pulse">🎉 ¡Correcto! ¡Excelente trabajo! 🎉</span>`;
            checkBtn.classList.add('hidden'); nextBtn.classList.remove('hidden');
            this.showWordTranslations(words, dropZone);
            Array.from(dropZone.children).forEach(el => { el.draggable = false; el.classList.add('correct'); });
        } else {
            this.dependencies.playSound('wrong');
            this.state.errors++;
            feedbackEl.innerHTML = `<span class="text-red-400 font-bold text-lg">🤔 Aún no es correcto. ¡Puedes intentarlo de nuevo!</span>`;
            dropZone.classList.add('shake');
            setTimeout(() => { if(feedbackEl) feedbackEl.innerHTML = ''; if(dropZone) dropZone.classList.remove('shake'); }, 2000);
        }
    },

    showWordTranslations(words, container) {
        if (!this.state) return;
        const wordElements = Array.from(container.children);
        wordElements.forEach((wordEl, index) => {
            const cleanWord = words[index].toLowerCase().replace(/[.,;!?"]$/, '');
            const glossData = this.state.glossary.get(cleanWord);
            const translation = glossData ? glossData.translation : '...';
            const translationEl = document.createElement('span');
            translationEl.className = 'word-translation';
            translationEl.textContent = translation;
            wordEl.appendChild(translationEl);
        });
    },

    nextSentence() {
        if (!this.state) return;
        this.dependencies.playSound('click');
        this.state.currentIndex++;
        if (this.state.currentIndex < this.state.totalSentences) { this.loadSentence(this.state.currentIndex); } else { this.showFinalScore(); }
    },

    showFinalScore() {
        if (!this.state) return;
        this.dependencies.playSound('congrats');
        const finalProgress = this.state.totalSentences > 0 ? Math.round((this.state.correctAnswers / this.state.totalSentences) * 100) : 0;
        this.dependencies.saveProgress(this.state.storyId, this.state.gameId, finalProgress, this.state.errors);
        this.elements.area.innerHTML = `<div class="text-center flex flex-col items-center justify-center h-full gap-4"><h3 class="text-4xl font-bold text-yellow-300">¡Juego Completado!</h3><p class="text-xl">Respuestas correctas: ${this.state.correctAnswers} de ${this.state.totalSentences}</p><p class="text-7xl font-bold my-4 text-white">${finalProgress}%</p><button id="jumbled-close-final" class="mt-6 px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-lg">Volver a Actividades</button></div>`;
        this.elements.area.querySelector('#jumbled-close-final').onclick = () => { this.dependencies.playSound('click'); this.close(false); };
    },

    updateScore() { 
        if (!this.state) return;
        const currentProgress = this.state.totalSentences > 0 ? Math.round((this.state.correctAnswers / this.state.totalSentences) * 100) : 0;
        this.elements.scoreDisplay.textContent = `Progreso: ${currentProgress}%`; 
    },

    close(save = true) {
        if (save && this.state && this.state.totalSentences > 0) {
            const currentProgress = Math.round((this.state.correctAnswers / this.state.totalSentences) * 100);
            this.dependencies.saveProgress(this.state.storyId, this.state.gameId, currentProgress, this.state.errors);
        }
        this.elements.area.innerHTML = '';
        this.state = null;
        if (this.dependencies.onClose) {
            this.dependencies.onClose();
        }
    }
};

/**
 * Módulo para el juego de Trivia (Quiz).
 */
const QuizGame = {
    state: null, elements: {}, dependencies: {}, TIMER_DURATION: 15,
    init(gameData, storyId, dependencies) {
        this.dependencies = dependencies;
        this.state = {
            questions: gameData.q, currentIndex: 0, totalQuestions: gameData.q.length, timer: null, timeLeft: 0,
            storyId: storyId, gameId: gameData.id, correctAnswers: 0, errors: 0,
        };
        this.elements = {
            view: document.getElementById('game-view'), 
            area: document.getElementById('game-area'), 
            title: document.getElementById('game-view-title'),
            subtitle: document.getElementById('game-view-subtitle'), 
            scoreDisplay: document.getElementById('game-score-display'),
        };
        const { t: title, s: subtitle } = GameUtils.parseText(gameData.t);
        this.elements.title.textContent = title; this.elements.subtitle.textContent = subtitle;
        this.loadQuestion(this.state.currentIndex);
        this.updateScore();
    },
    loadQuestion(index) {
        if (!this.state) return; this.clearTimer(); this.elements.area.innerHTML = '';
        const template = document.getElementById('quiz-game-template');
        this.elements.area.appendChild(template.content.cloneNode(true));
        const questionData = this.state.questions[index];
        const { t: questionText, s: questionSubtext } = GameUtils.parseText(questionData.q);
        const options = questionData.o;
        this.elements.area.querySelector('#quiz-question').textContent = questionText;
        this.elements.area.querySelector('#quiz-question-sub').textContent = questionSubtext;
        this.elements.area.querySelector('#quiz-progress').textContent = `Pregunta ${index + 1} de ${this.state.totalQuestions}`;
        const optionsContainer = this.elements.area.querySelector('#quiz-options');
        options.forEach(option => {
            const { t: optionText } = GameUtils.parseText(option);
            const button = document.createElement('button');
            button.className = 'quiz-option-btn'; button.textContent = optionText;
            button.onclick = () => this.handleAnswer(option, questionData.a, button);
            optionsContainer.appendChild(button);
        });
        this.elements.area.querySelector('#quiz-next-btn').onclick = () => this.nextQuestion();
        this.startTimer();
    },
    startTimer() {
        if (!this.state) return; this.state.timeLeft = this.TIMER_DURATION;
        const timerBar = this.elements.area.querySelector('#quiz-timer-bar');
        timerBar.style.transition = 'none'; timerBar.style.width = '100%';
        timerBar.classList.remove('bg-yellow-500', 'bg-red-600'); timerBar.classList.add('bg-green-500');
        setTimeout(() => { if(this.state) { timerBar.style.transition = `width ${this.TIMER_DURATION}s linear`; timerBar.style.width = '0%'; } }, 100);
        this.state.timer = setInterval(() => {
            if (!this.state) { this.clearTimer(); return; }
            this.state.timeLeft--;
            if (this.state.timeLeft < 10) timerBar.classList.replace('bg-green-500', 'bg-yellow-500');
            if (this.state.timeLeft < 5) timerBar.classList.replace('bg-yellow-500', 'bg-red-600');
            if (this.state.timeLeft <= 0) { this.handleTimeOut(); }
        }, 1000);
    },
    clearTimer() { if (this.state && this.state.timer) { clearInterval(this.state.timer); this.state.timer = null; } },
    handleTimeOut() {
        if (!this.state) return; this.clearTimer(); this.state.errors++;
        this.dependencies.playSound('wrong');
        const feedbackEl = this.elements.area.querySelector('#quiz-feedback');
        feedbackEl.innerHTML = `<span class="text-red-400 font-bold text-lg">¡Se acabó el tiempo!</span>`;
        this.revealCorrectAnswer();
        this.elements.area.querySelector('#quiz-next-btn').classList.remove('hidden');
    },
    handleAnswer(selectedOption, correctAnswer, buttonEl) {
        if (!this.state) return; this.clearTimer();
        this.dependencies.playSound('click');
        const { t: selectedText } = GameUtils.parseText(selectedOption);
        const { t: correctText } = GameUtils.parseText(correctAnswer);
        const feedbackEl = this.elements.area.querySelector('#quiz-feedback');
        Array.from(this.elements.area.querySelectorAll('.quiz-option-btn')).forEach(btn => { btn.disabled = true; });
        if (selectedText === correctText) {
            this.dependencies.playSound('ok');
            this.state.correctAnswers++; this.updateScore();
            buttonEl.classList.add('correct-answer');
            feedbackEl.innerHTML = `<span class="text-green-400 font-bold text-lg animate-pulse">🎉 ¡Correcto! 🎉</span>`;
        } else {
            this.dependencies.playSound('wrong');
            this.state.errors++;
            buttonEl.classList.add('wrong-answer');
            feedbackEl.innerHTML = `<span class="text-red-400 font-bold text-lg">🤔 Incorrecto.</span>`;
            this.revealCorrectAnswer();
        }
        this.elements.area.querySelector('#quiz-next-btn').classList.remove('hidden');
    },
    revealCorrectAnswer() {
        if (!this.state) return;
        const { t: correctText } = GameUtils.parseText(this.state.questions[this.state.currentIndex].a);
        const allButtons = this.elements.area.querySelectorAll('.quiz-option-btn');
        allButtons.forEach(btn => { if (btn.textContent === correctText) { btn.classList.add('correct-answer'); } btn.disabled = true; });
    },
    nextQuestion() {
        if (!this.state) return; 
        this.dependencies.playSound('click');
        this.state.currentIndex++;
        if (this.state.currentIndex < this.state.totalQuestions) { this.loadQuestion(this.state.currentIndex); } else { this.showFinalScore(); }
    },
    showFinalScore() {
        if (!this.state) return;
        this.dependencies.playSound('congrats');
        const finalProgress = this.state.totalQuestions > 0 ? Math.round((this.state.correctAnswers / this.state.totalQuestions) * 100) : 0;
        this.dependencies.saveProgress(this.state.storyId, this.state.gameId, finalProgress, this.state.errors);
        this.elements.area.innerHTML = `<div class="text-center flex flex-col items-center justify-center h-full gap-4"><h3 class="text-4xl font-bold text-yellow-300">¡Juego Completado!</h3><p class="text-xl">Respuestas correctas: ${this.state.correctAnswers} de ${this.state.totalQuestions}</p><p class="text-7xl font-bold my-4 text-white">${finalProgress}%</p><button id="quiz-close-final" class="mt-6 px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-lg">Volver a Actividades</button></div>`;
        this.elements.area.querySelector('#quiz-close-final').onclick = () => { this.dependencies.playSound('click'); this.close(false); };
    },
    updateScore() {
        if (!this.state) return;
        const currentProgress = this.state.totalQuestions > 0 ? Math.round((this.state.correctAnswers / this.state.totalQuestions) * 100) : 0;
        this.elements.scoreDisplay.textContent = `Progreso: ${currentProgress}%`;
    },
    close(save = true) {
        if (save && this.state && this.state.totalQuestions > 0) {
            const currentProgress = Math.round((this.state.correctAnswers / this.state.totalQuestions) * 100);
            this.dependencies.saveProgress(this.state.storyId, this.state.gameId, currentProgress, this.state.errors);
        }
        this.clearTimer();
        this.elements.area.innerHTML = '';
        this.state = null;
        if (this.dependencies.onClose) {
            this.dependencies.onClose();
        }
    }
};

/**
 * Módulo para el juego de Tarjetas de Memoria (Memory Cards).
 */
const MemoryCardsGame = {
    state: null, elements: {}, dependencies: {},
    async init(gameData, storyId, deps) {
        this.dependencies = deps;
        this.state = {
            cards: [], flippedCards: [], matchedPairs: 0, totalPairs: 0, mismatches: 0, lockBoard: false, timer: null, storyId: storyId, gameId: gameData.id,
        };
        this.elements = {
            view: document.getElementById('game-view'), 
            area: document.getElementById('game-area'), 
            title: document.getElementById('game-view-title'),
            subtitle: document.getElementById('game-view-subtitle'), 
            scoreDisplay: document.getElementById('game-score-display'),
        };
        const { t: title, s: subtitle } = GameUtils.parseText(gameData.t);
        this.elements.title.textContent = title; this.elements.subtitle.textContent = subtitle;
        this.elements.area.innerHTML = '';
        const template = document.getElementById('memory-game-template');
        this.elements.area.appendChild(template.content.cloneNode(true));
        const vocabList = gameData.v_str.split('|').map(p => { const [en, es] = p.split('<'); return { en: en.trim(), es: es.replace('>', '').trim() }; });
        this.state.totalPairs = vocabList.length;
        this.updateScore();
        this.elements.area.querySelector('#memory-total-pairs').textContent = this.state.totalPairs;
        const cardDataWithImages = await this.fetchCardImages(vocabList);
        if (!this.state) return; // Check if closed during async fetch
        this.state.cards = GameUtils.shuffleArray([...cardDataWithImages, ...cardDataWithImages]);
        this.renderBoard();
    },
    async fetchCardImages(vocabList) {
        if (!this.state) return [];
        const loadingProgress = this.elements.area.querySelector('#memory-loading-progress');
        const promises = vocabList.map(v => this.dependencies.fetchPexels(v.en));
        let loadedCount = 0;
        const trackingPromises = promises.map(p => p.then(result => {
            loadedCount++;
            if(this.state && loadingProgress) {
                const percentage = Math.round((loadedCount / vocabList.length) * 100);
                loadingProgress.textContent = `${percentage}%`;
            }
            return result;
        }));
        const imageUrls = await Promise.all(trackingPromises);
        return vocabList.map((vocab, index) => ({...vocab, id: index, imageUrl: imageUrls[index] || `https://placehold.co/400x400/374151/FFFFFF?text=${vocab.en}`}));
    },
    renderBoard() {
        if (!this.state) return;
        const grid = this.elements.area.querySelector('#memory-grid');
        grid.innerHTML = '';
        this.elements.area.querySelector('#memory-loading-overlay').classList.add('hidden');
        this.state.cards.forEach((cardData) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'memory-card'; cardEl.dataset.id = cardData.id;
            cardEl.innerHTML = `<div class="card-face card-front"><svg class="card-front-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg></div><div class="card-face card-back"><img src="${cardData.imageUrl}" alt="${cardData.en}" class="card-back-image"><div class="card-back-text-container"><span class="card-back-word">${cardData.en}</span><span class="card-back-translation">${cardData.es}</span></div></div>`;
            cardEl.addEventListener('click', () => this.flipCard(cardEl));
            grid.appendChild(cardEl);
        });
    },
    flipCard(cardEl) {
        if (!this.state || this.state.lockBoard || cardEl.classList.contains('is-flipped') || cardEl.classList.contains('is-matched')) { return; }
        this.dependencies.playSound('click');
        cardEl.classList.add('is-flipped');
        this.state.flippedCards.push(cardEl);
        if (this.state.flippedCards.length === 2) { this.checkForMatch(); }
    },
    checkForMatch() {
        if (!this.state) return; this.state.lockBoard = true;
        const [cardOne, cardTwo] = this.state.flippedCards;
        const isMatch = cardOne.dataset.id === cardTwo.dataset.id;
        if (isMatch) { setTimeout(() => this.onMatch(), 500); } else { this.state.mismatches++; this.updateScore(); setTimeout(() => this.onMismatch(), 1200); }
    },
    onMatch() {
        if (!this.state) return;
        this.dependencies.playSound('ok');
        const [cardOne, cardTwo] = this.state.flippedCards;
        cardOne.classList.add('is-matched'); cardTwo.classList.add('is-matched');
        this.state.matchedPairs++; this.updateScore(); this.resetFlipState();
        if (this.state.matchedPairs === this.state.totalPairs) { this.stopTimer(); setTimeout(() => this.showFinalScore(), 800); }
    },
    onMismatch() {
        if (!this.state) return;
        this.dependencies.playSound('wrong');
        const [cardOne, cardTwo] = this.state.flippedCards;
        cardOne.classList.add('shake'); cardTwo.classList.add('shake');
        setTimeout(() => {
            if (!this.state) return;
            cardOne.classList.remove('is-flipped', 'shake');
            cardTwo.classList.remove('is-flipped', 'shake');
            this.resetFlipState();
        }, 600);
    },
    resetFlipState() { if (this.state) { this.state.flippedCards = []; this.state.lockBoard = false; } },
    stopTimer() { if (this.state && this.state.timer) { clearInterval(this.state.timer); this.state.timer = null; } },
    updateScore() {
        if (!this.state) return;
        const progress = this.state.totalPairs > 0 ? Math.round((this.state.matchedPairs / this.state.totalPairs) * 100) : 0;
        this.elements.scoreDisplay.textContent = `Progreso: ${progress}%`;
        const pairsFoundEl = this.elements.area.querySelector('#memory-pairs-found');
        const mismatchesEl = this.elements.area.querySelector('#memory-mismatches');
        if (pairsFoundEl) pairsFoundEl.textContent = this.state.matchedPairs;
        if (mismatchesEl) mismatchesEl.textContent = this.state.mismatches;
    },
    showFinalScore() {
        if (!this.state) return;
        this.dependencies.playSound('congrats');
        const errorsForPoints = Math.max(0, this.state.mismatches - 5);
        this.dependencies.saveProgress(this.state.storyId, this.state.gameId, 100, errorsForPoints);
        this.elements.area.innerHTML = `<div class="text-center flex flex-col items-center justify-center h-full gap-4"><h3 class="text-4xl font-bold text-yellow-300">🎉 ¡Felicidades! 🎉</h3><p class="text-xl">Completaste el juego con ${this.state.mismatches} fallos.</p><button id="memory-close-final" class="mt-6 px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-lg">Volver a Actividades</button></div>`;
        this.elements.area.querySelector('#memory-close-final').onclick = () => { this.dependencies.playSound('click'); this.close(false); };
    },
    close(save = true) {
        if (save && this.state && this.state.totalPairs > 0) {
            const progress = Math.round((this.state.matchedPairs / this.state.totalPairs) * 100);
            const errorsForPoints = Math.max(0, this.state.mismatches - 5);
            this.dependencies.saveProgress(this.state.storyId, this.state.gameId, progress, errorsForPoints);
        }
        this.stopTimer();
        this.elements.area.innerHTML = '';
        this.state = null;
        if (this.dependencies.onClose) {
            this.dependencies.onClose();
        }
    }
};

/**
 * Módulo para el juego de Completar la Oración (Fill in the Blanks).
 */
const FillTheBlanksGame = {
    state: null, elements: {}, dependencies: {},
    init(gameData, storyId, dependencies) {
        this.dependencies = dependencies;
        this.state = {
            questions: gameData.q, currentIndex: 0, totalQuestions: gameData.q.length,
            storyId: storyId, gameId: gameData.id, correctAnswers: 0, errors: 0,
        };
        this.elements = {
            view: document.getElementById('game-view'), 
            area: document.getElementById('game-area'), 
            title: document.getElementById('game-view-title'),
            subtitle: document.getElementById('game-view-subtitle'), 
            scoreDisplay: document.getElementById('game-score-display'),
        };
        const { t: title, s: subtitle } = GameUtils.parseText(gameData.t);
        this.elements.title.textContent = title; this.elements.subtitle.textContent = subtitle;
        this.loadQuestion(this.state.currentIndex);
        this.updateScore();
    },
    loadQuestion(index) {
        if (!this.state) return;
        this.elements.area.innerHTML = '';
        const template = document.getElementById('fill-blanks-template');
        this.elements.area.appendChild(template.content.cloneNode(true));
        const questionData = this.state.questions[index];
        const { s: sentenceData, a: answerData } = questionData;
        const { t: sentenceText } = GameUtils.parseText(sentenceData);
        const { t: answerWord } = GameUtils.parseText(answerData);
        const sentenceContainer = this.elements.area.querySelector('#fill-blanks-sentence');
        const [part1, part2] = sentenceText.split('_____');
        const wordContainer = document.createElement('span');
        wordContainer.id = 'fill-blanks-word-container'; wordContainer.className = 'inline-flex flex-wrap justify-center items-center gap-1 mx-2';
        sentenceContainer.appendChild(document.createTextNode(part1));
        sentenceContainer.appendChild(wordContainer);
        sentenceContainer.appendChild(document.createTextNode(part2));
        answerWord.split('').forEach(() => { const slot = document.createElement('div'); slot.className = 'letter-slot empty'; wordContainer.appendChild(slot); });
        const choicesContainer = this.elements.area.querySelector('#fill-blanks-choices');
        const correctLetters = answerWord.toUpperCase().split('');
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let distractors = [];
        const numDistractors = Math.max(4, 12 - correctLetters.length);
        while (distractors.length < numDistractors) {
            const randomLetter = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
            if (!correctLetters.includes(randomLetter) && !distractors.includes(randomLetter)) { distractors.push(randomLetter); }
        }
        const allChoices = GameUtils.shuffleArray([...correctLetters, ...distractors]);
        allChoices.forEach(letter => {
            const button = document.createElement('button');
            button.className = 'letter-choice'; button.textContent = letter;
            button.onclick = () => this.handleLetterClick(letter, button);
            choicesContainer.appendChild(button);
        });
        this.elements.area.querySelector('#fill-blanks-progress').textContent = `Oración ${index + 1} de ${this.state.totalQuestions}`;
        this.elements.area.querySelector('#fill-blanks-delete-btn').onclick = () => this.handleDelete();
        this.elements.area.querySelector('#fill-blanks-next-btn').onclick = () => this.nextQuestion();
    },
    handleLetterClick(letter, buttonEl) {
        if (!this.state) return;
        this.dependencies.playSound('click');
        const firstEmptySlot = this.elements.area.querySelector('.letter-slot.empty');
        if (firstEmptySlot) {
            firstEmptySlot.textContent = letter;
            firstEmptySlot.classList.remove('empty');
            buttonEl.disabled = true;
        }
        if (!this.elements.area.querySelector('.letter-slot.empty')) {
            this.checkAnswer();
        }
    },
    handleDelete() {
        if (!this.state) return;
        this.dependencies.playSound('click');
        const filledSlots = this.elements.area.querySelectorAll('.letter-slot:not(.empty)');
        if (filledSlots.length === 0) return;
        const lastFilledSlot = filledSlots[filledSlots.length - 1];
        if (lastFilledSlot) {
            const letterToRestore = lastFilledSlot.textContent;
            lastFilledSlot.textContent = '';
            lastFilledSlot.classList.add('empty');
            const buttons = this.elements.area.querySelectorAll('.letter-choice');
            const buttonToEnable = Array.from(buttons).find(btn => btn.textContent === letterToRestore && btn.disabled);
            if (buttonToEnable) buttonToEnable.disabled = false;
        }
    },
    checkAnswer() {
        if (!this.state) return;
        const slots = this.elements.area.querySelectorAll('.letter-slot');
        const userAnswer = Array.from(slots).map(slot => slot.textContent).join('');
        const { t: correctAnswer } = GameUtils.parseText(this.state.questions[this.state.currentIndex].a);
        const feedbackEl = this.elements.area.querySelector('#fill-blanks-feedback');
        const wordContainer = this.elements.area.querySelector('#fill-blanks-word-container');
        if (userAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
            this.dependencies.playSound('ok');
            this.state.correctAnswers++;
            this.updateScore();
            feedbackEl.innerHTML = `<span class="text-green-400 font-bold text-lg animate-pulse">🎉 ¡Correcto! 🎉</span>`;
            wordContainer.classList.add('correct');
            this.elements.area.querySelector('#fill-blanks-next-btn').classList.remove('hidden');
            this.elements.area.querySelector('#fill-blanks-choices').style.pointerEvents = 'none';
            this.elements.area.querySelector('#fill-blanks-delete-btn').disabled = true;
            const questionData = this.state.questions[this.state.currentIndex];
            const { s: spanishSentenceTemplate } = GameUtils.parseText(questionData.s);
            const { s: spanishAnswer } = GameUtils.parseText(questionData.a);
            const translationEl = this.elements.area.querySelector('#fill-blanks-translation');
            const fullTranslationHTML = spanishSentenceTemplate.replace('_____', `<strong class="text-indigo-300 font-bold">${spanishAnswer}</strong>`);
            translationEl.innerHTML = fullTranslationHTML;
            translationEl.classList.remove('hidden');
        } else {
            this.dependencies.playSound('wrong');
            this.state.errors++;
            feedbackEl.innerHTML = `<span class="text-red-400 font-bold text-lg">🤔 Incorrecto. Usa el botón de borrar para corregir.</span>`;
            wordContainer.classList.add('shake');
            setTimeout(() => {
                if (!this.state) return;
                feedbackEl.innerHTML = '';
                wordContainer.classList.remove('shake');
            }, 2500);
        }
    },
    nextQuestion() {
        if (!this.state) return;
        this.dependencies.playSound('click');
        this.state.currentIndex++;
        if (this.state.currentIndex < this.state.totalQuestions) {
            this.loadQuestion(this.state.currentIndex);
        } else {
            this.showFinalScore();
        }
    },
    showFinalScore() {
        if (!this.state) return;
        this.dependencies.playSound('congrats');
        const finalProgress = this.state.totalQuestions > 0 ? Math.round((this.state.correctAnswers / this.state.totalQuestions) * 100) : 0;
        this.dependencies.saveProgress(this.state.storyId, this.state.gameId, finalProgress, this.state.errors);
        this.elements.area.innerHTML = `<div class="text-center flex flex-col items-center justify-center h-full gap-4"><h3 class="text-4xl font-bold text-yellow-300">¡Juego Completado!</h3><p class="text-xl">Respuestas correctas: ${this.state.correctAnswers} de ${this.state.totalQuestions}</p><p class="text-7xl font-bold my-4 text-white">${finalProgress}%</p><button id="fill-blanks-close-final" class="mt-6 px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-lg">Volver a Actividades</button></div>`;
        this.elements.area.querySelector('#fill-blanks-close-final').onclick = () => { this.dependencies.playSound('click'); this.close(false); };
    },
    updateScore() {
        if (!this.state) return;
        const currentProgress = this.state.totalQuestions > 0 ? Math.round((this.state.correctAnswers / this.state.totalQuestions) * 100) : 0;
        this.elements.scoreDisplay.textContent = `Progreso: ${currentProgress}%`;
    },
    close(save = true) {
        if (save && this.state && this.state.totalQuestions > 0) {
            const currentProgress = Math.round((this.state.correctAnswers / this.state.totalQuestions) * 100);
            this.dependencies.saveProgress(this.state.storyId, this.state.gameId, currentProgress, this.state.errors);
        }
        this.elements.area.innerHTML = '';
        this.state = null;
        if (this.dependencies.onClose) {
            this.dependencies.onClose();
        }
    }
};