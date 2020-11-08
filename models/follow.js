'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Follow extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  };
  Follow.init({
    followedUser_id: DataTypes.INTEGER,
    user_id: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Follow',
  });
  Follow.associate = function (models) {
    Follow.hasOne(models.User, {
      sourceKey: 'followedUser_id',
      foreignKey: 'id'
    });
  };

  return Follow;
};
