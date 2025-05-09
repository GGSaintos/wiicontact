const bcrypt = require('bcryptjs');

const password = "123"; // Replace with test password
bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, (err, hash) => {
        console.log("Generated hash:", hash);
    });
});