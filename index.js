const Database = require('dbcmps369');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

class ContactDB {
    constructor() {
        this.db = null;
    }

    async initialize() {
        try {
            const dataDir = path.resolve(__dirname, 'data');
            console.log('Database:', dataDir);
            
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
                console.log('Directory');
            }
            
            process.env.DBPATH = path.join(dataDir, 'contacts.db').replace(/\\/g, '/');
            console.log('Set DBPATH to:', process.env.DBPATH);
            
            this.db = new Database();
            await this.db.connect();
            console.log('Connected to database');
            
            await this.createTables();
            await this.ensureDefaultUser();
            
            return this;
        } catch (error) {
            console.error('Database initialization error:', error);
            throw error;
        }
    }

    async createTables() {
        await this.db.schema('Contacts', [
        { name: 'ID', type: 'INTEGER', primary: true, auto: true },
        { name: 'FirstName', type: 'TEXT' },
        { name: 'LastName', type: 'TEXT' },
        { name: 'PhoneNumber', type: 'TEXT' },
        { name: 'EmailAddress', type: 'TEXT' },
        { name: 'Street', type: 'TEXT' },
        { name: 'City', type: 'TEXT' },
        { name: 'State', type: 'TEXT' },
        { name: 'Zip', type: 'TEXT' },
        { name: 'Country', type: 'TEXT' },
        { name: 'Longitude', type: 'REAL' },            
        { name: 'Contact_By_Email', type: 'INTEGER' },
        { name: 'Contact_By_Phone', type: 'INTEGER' },
        { name: 'Contact_By_Mail', type: 'INTEGER' }
        ], 'ID');
    
        await this.db.schema('Users', [
            { name: 'ID', type: 'INTEGER', primary: true, auto: true },
            { name: 'FirstName', type: 'TEXT' },
            { name: 'LastName', type: 'TEXT' },
            { name: 'Username', type: 'TEXT', unique: true },
            { name: 'Password', type: 'TEXT' }
        ], 'ID');
    }

    async ensureDefaultUser() {
        const users = await this.db.read('Users', [{ column: 'Username', value: 'gg' }]);
    
        if (users.length === 0) {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash('santos', salt);
    
            await this.db.create('Users', [
                { column: 'FirstName', value: 'Default' },
                { column: 'LastName', value: 'Admin' },
                { column: 'Username', value: 'gg' },
                { column: 'Password', value: hash } 
            ]);
            console.log('Default user created successfully');
        }
    }

    async getAllContacts() {
        return await this.db.read('Contacts', []);
    }

    async getContactById(id) {
        const contacts = await this.db.read('Contacts', [{ column: 'ID', value: id }]);
        return contacts.length > 0 ? contacts[0] : null;
    }

    async createContact(contact) {
        const contactByEmail = contact.Contact_By_Email ? 1 : 0;
        const contactByPhone = contact.Contact_By_Phone ? 1 : 0;
        const contactByMail = contact.Contact_By_Mail ? 1 : 0;
    
        const contactData = [
        { column: 'FirstName', value: contact.FirstName },
        { column: 'LastName', value: contact.LastName },
        { column: 'PhoneNumber', value: contact.PhoneNumber },
        { column: 'EmailAddress', value: contact.EmailAddress },
        { column: 'Street', value: contact.Street },
        { column: 'City', value: contact.City },
        { column: 'State', value: contact.State },
        { column: 'Zip', value: contact.Zip },
        { column: 'Country', value: contact.Country },
        { column: 'Latitude', value: contact.Latitude },     
        { column: 'Longitude', value: contact.Longitude },    
        { column: 'Contact_By_Email', value: contactByEmail },
        { column: 'Contact_By_Phone', value: contactByPhone },
        { column: 'Contact_By_Mail', value: contactByMail }
        ];
    
        const id = await this.db.create('Contacts', contactData);
        return {
          ID: id,
          ...contact,
          Contact_By_Email: contactByEmail,
          Contact_By_Phone: contactByPhone,
          Contact_By_Mail: contactByMail
        };
    }
    
    async updateContact(id, contact) {
        const contactByEmail = contact.Contact_By_Email ? 1 : 0;
        const contactByPhone = contact.Contact_By_Phone ? 1 : 0;
        const contactByMail = contact.Contact_By_Mail ? 1 : 0;
    
        const contactData = [
          { column: 'FirstName', value: contact.FirstName },
          { column: 'LastName', value: contact.LastName },
          { column: 'PhoneNumber', value: contact.PhoneNumber },
          { column: 'EmailAddress', value: contact.EmailAddress },
          { column: 'Street', value: contact.Street },
          { column: 'City', value: contact.City },
          { column: 'State', value: contact.State },
          { column: 'Zip', value: contact.Zip },
          { column: 'Country', value: contact.Country },
          { column: 'Contact_By_Email', value: contactByEmail },
          { column: 'Contact_By_Phone', value: contactByPhone },
          { column: 'Contact_By_Mail', value: contactByMail } 
        ];
    
        await this.db.update('Contacts', contactData, [{ column: 'ID', value: id }]);
    
        return {
          ID: id,
          ...contact,
          Contact_By_Email: contactByEmail,
          Contact_By_Phone: contactByPhone,
          Contact_By_Mail: contactByMail
        };
    }

    async deleteContact(id) {
        await this.db.delete('Contacts', [{ column: 'ID', value: id }]);
        return { ID: id };
    }

    async getUserByUsername(username) {
        const users = await this.db.read('Users', [{ column: 'Username', value: username }]);
        return users.length > 0 ? users[0] : null;
      }

    async createUser(user) {
    
        const userData = [
          { column: 'FirstName', value: user.FirstName },
          { column: 'LastName', value: user.LastName },
          { column: 'Username', value: user.Username }, 
          { column: 'Password', value: user.Password }
        ];
      
        const id = await this.db.create('Users', userData);
        return {
          ID: id,
          FirstName: user.FirstName,
          LastName: user.LastName,
          Username: user.Username
        };
      }

    async validateUser(email, Password) {
        const user = await this.getUserByUsername(email);
        if (!user) return false;

        const matches = await bcrypt.compare(Password, user.Password);
        console.log(`bcrypt.compare() result for ${email}:`, matches);
        
        return matches;

    }
}

module.exports = async function initDB() {
    const db = new ContactDB();
    await db.initialize();
    return db;
};