'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Bookmark extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  };
  Bookmark.init({
    url: DataTypes.STRING,
    title: DataTypes.STRING,
    site_name: DataTypes.STRING,
    memo: DataTypes.STRING,
    public: DataTypes.INTEGER,
    user_id: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Bookmark',
  });
  Bookmark.associate = function (models) {
    Bookmark.belongsToMany(models.Tag, {
      through: models.Tag_map,
      foreignKey: 'bookmark_id',
      otherKey: 'tag_id',
      as: 'bookmarkTags'
    });
    Bookmark.hasOne(models.User, {
      sourceKey: 'user_id',
      foreignKey: 'id'
    });
  };
  return Bookmark;
};
