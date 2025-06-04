const { Router } = require("express");
const router = Router();
require('dotenv').config();
const jwt = require('jsonwebtoken');
const UserDAO = require('./dao_user');

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.sendStatus(401);
    }
    const token = authHeader.split(' ')[1];
    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        req.user = user;
        next();
    } catch (error) {
        return res.sendStatus(401);
    }
}

const adminOnly = (req, res, next) => {
    if (req.user.roles.includes('admin')) {
        return next();
    }
    return res.sendStatus(403);
};

router.get('/', authMiddleware, async (req, res) => {
    const users = await UserDAO.getAll();
    return res.send(users);
});

router.post('/', async (req, res) => {
    const {email, password} = req.body;
    
    if (typeof password === 'undefined') {
        return res.sendStatus(400);
    }
    if (password.trim() == "") {
        return res.sendStatus(400);
    }

    const existing_user = await UserDAO.getUser(email);
    if (existing_user) {
        return res.sendStatus(409);
    }

    const user = await UserDAO.create(email, password);

    const token = jwt.sign({
        email: user.email,
        _id: user._id,
        roles: user.roles, // add roles
    }, process.env.JWT_SECRET, {expiresIn: '30m'});

    return res.status(200).send({token});
});


router.post('/signup', async (req, res) => {
    const {email, password} = req.body;
    if (typeof password === 'undefined') {
        return res.sendStatus(400);
    }
    if (password.trim() == "") {
        return res.sendStatus(400);
    }

    const existing_user = await UserDAO.getUser(email);
    if (existing_user) {
        return res.sendStatus(409);
    }

    await UserDAO.create(email, password);
    return res.sendStatus(200);
});


router.put('/password', authMiddleware, async (req, res) => {
    const {email, password} = req.body;
    // const userIdToUpdate = req.params.id;
    const loggedInUserId = req.user._id;

    if (typeof password === 'undefined') {
        return res.sendStatus(400);
    }
    if (password.trim() == "") {
        return res.sendStatus(400);
    }


    await UserDAO.changePassword(loggedInUserId, req.body.password);
    return res.sendStatus(200);
    // Is the user authorized with the correct role to access the id?
    // If so, change the password and return 200
    // if (userIdToUpdate=== loggedInUserId || req.user.roles.includes('admin')) {
    //     await UserDAO.changePassword(userIdToUpdate, req.body.password);
    //     return res.sendStatus(200);
    // }
    // else {
    //     return res.sendStatus(401);
    // }
    // await UserDAO.changePassword(email, password);
    // return res.sendStatus(200);
});

router.post('/login', async (req, res) => {
    // Get email and password from the HTTP body
    // Lookup the user by email and get the hashed password
    //   - if doesn't exist, return.... 401
    // Compare the passwords, authenticated if there's a match

    const {email, password} = req.body;
    
    if (typeof password === 'undefined') {
        return res.sendStatus(400);
    }
    if (password.trim() == "") {
        return res.sendStatus(400);
    }

    const user = await UserDAO.login(email, password);
    if (!user) {
        return res.status(401).send("User not exist or bad password");
    }

    // const twoFactorAuthCode = '40400';
    // await UserDAO.addTwoFactorAuthCode(email, twoFactorAuthCode);

    // return res.send({
    //     message: 'Verify 2 factor auth',
    //     link: '/users/verify',
    // });

    const token = jwt.sign({
        email: user.email,
        _id: user._id,
        roles: user.roles, // add roles
    }, process.env.JWT_SECRET, {expiresIn: '30m'});

    return res.send({token});
});

router.post('/verify', async (req, res) => {
    const {email, twoFactorAuthCode} = req.body;
    const user = await UserDAO.verifyTwoFactorAuthCode(email, twoFactorAuthCode);
    if (!user) {
        return res.sendStatus(401);
    }

    const token = jwt.sign({
        email: user.email,
        userId: user._id,
    }, process.env.JWT_SECRET, {expiresIn: '30m'});

    return res.send({token});
});


// PATCH /some-user-id/password
router.patch('/:id/password', authMiddleware, async (req, res) => {
    const userIdToUpdate = req.params.id;
    const loggedInUserId = req.user.userId;
    
    // Is the user authorized with the correct role to access the id?
    // If so, change the password and return 200
    if (userIdToUpdate === loggedInUserId || req.user.roles.includes('admin')) {
        await UserDAO.changePassword(userIdToUpdate, req.body.password);
        return res.sendStatus(200);
    }

    // If not, return forbidden (403)
    return res.sendStatus(403);
});

// PATCH /some-user-id
router.patch('/:id', authMiddleware, adminOnly, async (req, res) => {
    // req = {
    //     body: {
    //         roles: ['admin']
    //     }
    // }

    const {roles} = req.body;
    const {id} = req.params;
    
    await UserDAO.updateRoles(id, roles);
    return res.sendStatus(200);
});

module.exports = router;
