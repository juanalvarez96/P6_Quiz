const Sequelize = require("sequelize");
const {models} = require("../models");


// Autoload the tip with id equals to :tipId
exports.load = (req, res, next, tipId) => {

    models.tip.findById(tipId)
        .then(tip => {
            if (tip) {
                req.tip = tip;
                next();
            } else {
                next(new Error('There is no tip with tipId=' + tipId));
            }
        })
        .catch(error => next(error));
};

// MW that allows actions only if the user logged in is admin or is the author of the tip.
exports.adminOrAuthorRequired = (req, res, next) => {

    const isAdmin  = !!req.session.user.isAdmin;
    const isAuthor = req.tip.authorId === req.session.user.id;

    if (isAdmin || isAuthor) {
        next();
    } else {
        console.log('Prohibited operation: The logged in user is not the author of the quiz, nor an administrator.');
        res.send(403);
    }
};

// Middleware: Login required.
//
// If the user is logged in previously then there will exists
// the req.session.user object, so I continue with the others
// middlewares or routes.
// If req.session.user does not exist, then nobody is logged,
// so I redirect to the login screen.
// I keep on redir which is my url to automatically return to
// that url after login; but if redir already exists then
// this value is maintained.
//
exports.loginRequired = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/session?redir=' + (req.param('redir') || req.url));
    }
};


// POST /quizzes/:quizId/tips
exports.create = (req, res, next) => {

    const authorId = req.session.user && req.session.user.id || 0;


    const tip = models.tip.build(
        {
            authorId: authorId,
            text: req.body.text,
            quizId: req.quiz.id
        });

    tip.save()
        .then(tip => {
            req.flash('success', 'Tip created successfully.');
            res.redirect("back");
        })
        .catch(Sequelize.ValidationError, error => {
            req.flash('error', 'There are errors in the form:');
            error.errors.forEach(({message}) => req.flash('error', message));
            res.redirect("back");
        })
        .catch(error => {
            req.flash('error', 'Error creating the new tip: ' + error.message);
            next(error);
        });
};


// GET /quizzes/:quizId/tips/:tipId/accept
exports.accept = (req, res, next) => {

    const {tip} = req;

    tip.accepted = true;

    tip.save(["accepted"])
        .then(tip => {
            req.flash('success', 'Tip accepted successfully.');
            res.redirect('/quizzes/' + req.params.quizId);
        })
        .catch(error => {
            req.flash('error', 'Error accepting the tip: ' + error.message);
            next(error);
        });
};


// DELETE /quizzes/:quizId/tips/:tipId
exports.destroy = (req, res, next) => {

    req.tip.destroy()
        .then(() => {
            req.flash('success', 'tip deleted successfully.');
            res.redirect('/quizzes/' + req.params.quizId);
        })
        .catch(error => next(error));
};

//MW for editing
exports.edit = (req, res, next) => {

    const {tip} = req;

    models.quiz.findById(tip.quizId)
        .then((quiz) => {
            res.render('tips/edit', {quiz:quiz, tip:tip});
        })

};

//MW for updating
exports.update = (req, res, next) => {
    const {tip} = req;

    tip.text = req.body.text;
    tip.accepted = false;

    tip.save({fields: ["text", "accepted"]})
        .then(tip => {
            req.flash('success', 'Tip edited successfully.');
            res.redirect('/quizzes/');
        })
        .catch(Sequelize.ValidationError, error => {
            req.flash('error', 'There are errors in the form:');
            error.errors.forEach(({message}) => req.flash('error', message));
            res.render('quizzes/');
        })
        .catch(error => {
            req.flash('error', 'Error editing the Quiz: ' + error.message);
            next(error);
        });
};

