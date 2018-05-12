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
    let score;
    hayQuizzes()
        .then(quizzes => {
            //Primera vez que se juega
            console.log( "score " +req.session.score);
            console.log(req.session.randomPlay);
            if (req.session.score === undefined) {
                req.session.score = 0;
                for (i = 0; i < quizzes.length; i++) {
                    toBeResolved[i] = quizzes[i].id;
                }
                score=req.session.score;
                req.session.randomPlay = toBeResolved;
                let indice = Math.floor(Math.random() * toBeResolved.length);
                let id = toBeResolved[indice];
                toBeResolved.splice(indice, 1);
                req.session.randomPlay = toBeResolved;
                validateId(id)
                    .then(quiz => {
                        res.render('quizzes/random_play', {
                            score: score,
                            quiz: quiz

                        })
                    })
                    .catch(error => {
                        //Acción a ejecutar en caso de error
                        console.log("Error")
                    })
            }
            //Seguir jugando
            if(req.session.score<quizzes.length){
                toBeResolved=req.session.randomPlay;
                score=req.session.score;
                let indice = Math.floor(Math.random() * toBeResolved.length);
                let id = toBeResolved[indice];
                toBeResolved.splice(indice, 1);
                req.session.randomPlay = toBeResolved;
                validateId(id)
                    .then(quiz => {
                        res.render('quizzes/random_play', {
                            score: score,
                            quiz: quiz

                        })
                    })
                    .catch(error => {
                        //Acción a ejecutar en caso de error
                        console.log("Error")
                    })

            }
            if(req.session.score>=quizzes.length){
                score = req.session.score;
                req.session.score=undefined;
                res.render('quizzes/random_nomore', {score: score})

            }
        })


};


//GET /quizzes/random_check/:quizId
exports.randomCheck = (req, res, next) => {
    const {quiz, query} = req;

    const answer = query.answer || "";
    const result = answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim();

    let score;

    if(result){
        //Jugador acierta
        req.session.score++;
        score = req.session.score;

    }
    else {
        score=req.session.score;
        req.session.score=0;

    }

    res.render('quizzes/random_result', {
        score:score,
        result:result,
        answer:answer
    });


};


const validateId = id => {
    return new Sequelize.Promise((resolve, reject) => {
        models.quiz.findById(id)
            .then(quiz => {
                if (!quiz) {
                    reject(new Error(`Quiz no existe`));
                } else {
                    resolve(quiz); //Se resuelve la promesa con el id correcto.

                }
            })


    });
};

const hayQuizzes = () => {
    return new Sequelize.Promise((resolve, reject) => {
        models.quiz.findAll()
            .then(quizzes => {
                if (quizzes.length > 0) {
                    resolve(quizzes);
                }
                else {
                    reject(new Error("No quizzes"));
                }
            })
    });
};








