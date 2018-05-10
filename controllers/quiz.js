const Sequelize = require("sequelize");
const {models} = require("../models");

// Autoload the quiz with id equals to :quizId
exports.load = (req, res, next, quizId) => {

    models.quiz.findById(quizId)
        .then(quiz => {
            if (quiz) {
                req.quiz = quiz;
                next();
            } else {
                throw new Error('There is no quiz with id=' + quizId);
            }
        })
        .catch(error => next(error));
};


// GET /quizzes
exports.index = (req, res, next) => {
    models.quiz.findAll()
        .then(quizzes => {
            res.render('quizzes/index.ejs', {quizzes});
        })
        .catch(error => next(error));
};


// GET /quizzes/:quizId
exports.show = (req, res, next) => {

    const {quiz} = req;

    res.render('quizzes/show', {quiz});
};


// GET /quizzes/new
exports.new = (req, res, next) => {

    const quiz = {
        question: "",
        answer: ""
    };

    res.render('quizzes/new', {quiz});
};

// POST /quizzes/create
exports.create = (req, res, next) => {

    const {question, answer} = req.body;

    const quiz = models.quiz.build({
        question,
        answer
    });

    // Saves only the fields question and answer into the DDBB
    quiz.save({fields: ["question", "answer"]})
        .then(quiz => {
            req.flash('success', 'Quiz created successfully.');
            res.redirect('/quizzes/' + quiz.id);
        })
        .catch(Sequelize.ValidationError, error => {
            req.flash('error', 'There are errors in the form:');
            error.errors.forEach(({message}) => req.flash('error', message));
            res.render('quizzes/new', {quiz});
        })
        .catch(error => {
            req.flash('error', 'Error creating a new Quiz: ' + error.message);
            next(error);
        });
};


// GET /quizzes/:quizId/edit
exports.edit = (req, res, next) => {

    const {quiz} = req;

    res.render('quizzes/edit', {quiz});
};


// PUT /quizzes/:quizId
exports.update = (req, res, next) => {

    const {quiz, body} = req;

    quiz.question = body.question;
    quiz.answer = body.answer;

    quiz.save({fields: ["question", "answer"]})
        .then(quiz => {
            req.flash('success', 'Quiz edited successfully.');
            res.redirect('/quizzes/' + quiz.id);
        })
        .catch(Sequelize.ValidationError, error => {
            req.flash('error', 'There are errors in the form:');
            error.errors.forEach(({message}) => req.flash('error', message));
            res.render('quizzes/edit', {quiz});
        })
        .catch(error => {
            req.flash('error', 'Error editing the Quiz: ' + error.message);
            next(error);
        });
};


// DELETE /quizzes/:quizId
exports.destroy = (req, res, next) => {

    req.quiz.destroy()
        .then(() => {
            req.flash('success', 'Quiz deleted successfully.');
            res.redirect('/quizzes');
        })
        .catch(error => {
            req.flash('error', 'Error deleting the Quiz: ' + error.message);
            next(error);
        });
};


// GET /quizzes/:quizId/play
exports.play = (req, res, next) => {

    const {quiz, query} = req;

    const answer = query.answer || '';

    res.render('quizzes/play', {
        quiz,
        answer
    });
};


// GET /quizzes/:quizId/check
exports.check = (req, res, next) => {

    const {quiz, query} = req;

    const answer = query.answer || "";
    const result = answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim();

    res.render('quizzes/result', {
        quiz,
        result,
        answer
    });
};


//GET /quizzes/randomplay
exports.randomPlay = (req, res, next) => {
    let toBeResolved = [];
    models.quiz.findAll()
        .then(quizzes => {
            let numberQuizzes = quizzes.length;
            console.log(numberQuizzes);
            //El jugador gana
            if (req.session.score >= numberQuizzes - 1) {
                let score = req.session.score;
                req.session.score=undefined;
                res.render('quizzes/random_nomore', {score: score})
            }
            //Partida empieza
            if (req.session.score === undefined) {
                req.session.score = 0;
                for (i = 0; i < quizzes.length; i++) {
                    toBeResolved[i] = quizzes[i].id;
                }
                //Ya está todo declarado
                req.session.randomPlay=toBeResolved;
                let indice = Math.floor(Math.random() * toBeResolved.length);
                let id = toBeResolved[indice];
                toBeResolved.splice(indice, 1);
                req.session.randomPlay=toBeResolved;
                let score = req.session.score;
                let quiz = quizzes[id];
                validateQuiz(quiz)
                    .then(quiz => {
                        res.render('quizzes/random_play', {
                            score: score,
                            quiz:quiz

                        })
                    })
                    .catch(error => {
                        console.log(error);
                    })


            }
            //Durante la partida
            else{
                let indice = Math.floor(Math.random() * toBeResolved.length);
                toBeResolved=req.session.randomPlay;
                let id = toBeResolved[indice];
                toBeResolved.splice(indice, 1);
                req.session.randomPlay=toBeResolved;
                let score = req.session.score;
                let quiz = quizzes[id];
                validateQuiz(quiz)
                    .then(quiz => {
                        res.render('quizzes/random_play', {
                            score: score,
                            quiz:quiz

                        })
                    })
                    .catch(error => {
                        console.log(error);
                    })
            }
        })


};


//GET /quizzes/random_check/:quizId
exports.randomCheck = (req, res, next) => {
    let score = req.session.score;
    const {quiz, query} = req;
    const answer = query.answer || "";
    const result = answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim();
    //Respuesta correcta
    if (result) {
        score++;
        req.session.score = score;
        res.render('quizzes/random_result', {
            score: score,
            result: result,
            answer: answer
        });
    }
    //respuesta incorrecta
    else {

        //Score cmabia para la siguiente partida a cero
        req.session.score = undefined;
        //Volvemos a actualizar el array de preguntas
        res.render('quizzes/random_result', {
            score: score,
            result: result,
            answer: answer
        })
    }


};


const playFirst = (req, res, next) => {
    req.session.ind1 = true; //Dice si hay que resetear el array
    req.session.ind2 = true; //Dice si la puntuación es cero
};

const resetScore = (req, res, next) => {
    req.session.score = 0;
};
const validateQuiz = quiz => {
    return new Sequelize.Promise((resolve, reject) => {
        if (typeof quiz === "undefined") {
            reject(new Error(`Quiz no existe`));
        } else {
                resolve(quiz); //Se resuelve la promesa con el id correcto.

        }
    });
};



