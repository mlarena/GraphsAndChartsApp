using System;
using System.Collections.Generic;

namespace GraphsAndChartsApp.ViewModels
{
    public class DSPDMeasurementViewModel
    {
        public int DspdDataId { get; set; }
        public DateTime DataTimestamp { get; set; }
        
        // Основные параметры
        public decimal? GripCoefficient { get; set; }        // Коэффициент сцепления
        public decimal? ShakeLevel { get; set; }             // Уровень вибрации
        public decimal? VoltagePower { get; set; }           // Напряжение питания
        
        // Температуры
        public decimal? CaseTemperature { get; set; }        // Температура корпуса
        public decimal? RoadTemperature { get; set; }        // Температура дороги
        
        // Высота осадков
        public decimal? WaterHeight { get; set; }            // Высота воды
        public decimal? IceHeight { get; set; }             // Высота льда
        public decimal? SnowHeight { get; set; }            // Высота снега
        
        // Проценты
        public decimal? IcePercentage { get; set; }          // Процент льда
        public decimal? PgmPercentage { get; set; }          // Процент ПГМ
        
        // Состояние дороги
        public int? RoadStatusCode { get; set; }            // Код состояния дороги
        public decimal? RoadAngle { get; set; }             // Угол наклона дороги
        public decimal? FreezeTemperature { get; set; }     // Температура замерзания
        public decimal? DistanceToSurface { get; set; }     // Расстояние до поверхности
        
        // Дополнительные параметры
        public int? CalibrationNeeded { get; set; }         // Требуется калибровка
        public decimal? GpsLatitude { get; set; }           // GPS широта
        public decimal? GpsLongitude { get; set; }          // GPS долгота
        public bool? GpsValid { get; set; }                // GPS валидный
    }

    public class DSPDDataViewModel
    {
        public int SensorId { get; set; }
        public string SerialNumber { get; set; }
        public string EndpointName { get; set; }
        public string PostName { get; set; }
        public List<DSPDMeasurementViewModel> Measurements { get; set; }
    }

    // Класс для описания параметра графика
    public class DSPDParameterInfo
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Unit { get; set; }
        public string Color { get; set; }
        public string PropertyName { get; set; }
        public bool Visible { get; set; }
        public int Order { get; set; }
    }
}