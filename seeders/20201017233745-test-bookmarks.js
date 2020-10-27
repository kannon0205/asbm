'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    const now = new Date();
    return queryInterface.bulkInsert('Bookmarks', [
      {
        url: 'http://localhost:3000/',
        title: 'マイブックマーク | ASB',
        site_name: 'ソーシャルブックマークサービス | ASB',
        memo: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Eius quibusdam, commodi ipsam tempora, doloremque,',
        public: 1,
        user_id: 1,
        createdAt: now,
        updatedAt: now
      },
    ], {});
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Bookmarks', null, {});
  }
};
