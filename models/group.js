'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Group extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  };
  Group.init({
    name: DataTypes.STRING,
    memo: DataTypes.STRING,
    owner: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Group',
  });
  Group.associate = function (models) {
    Group.hasMany(models.Group_map, {
      sourceKey: 'id',
      foreignKey: 'group_id'
    });
    Group.hasOne(models.User, {
      sourceKey: 'owner',
      foreignKey: 'id'
    });
  };

  return Group;
};
