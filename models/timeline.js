'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Timeline extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  };
  Timeline.init({
    name: DataTypes.STRING,
    number: DataTypes.INTEGER,
    owner_id: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Timeline',
  });
  Timeline.associate = function (models) {
    Timeline.hasMany(models.TimelineFollow, {
      foreignKey: 'timeline_id',
      sourceKey: 'id'
    });
    Timeline.hasMany(models.TimelineGroup, {
      foreignKey: 'timeline_id',
      sourceKey: 'id'
    });
    Timeline.hasMany(models.TimelineTag, {
      foreignKey: 'timeline_id',
      sourceKey: 'id'
    });
  };
  return Timeline;
};
