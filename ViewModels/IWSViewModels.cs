using System;
using System.Collections.Generic;

namespace GraphsAndChartsApp.ViewModels
{
    public class IWSMeasurementViewModel
    {
        public int IwsDataId { get; set; }
        public DateTime DataTimestamp { get; set; }
        
        // Температура и влажность
        public decimal? EnvironmentTemperature { get; set; }  // Температура окружающей среды
        public decimal? HumidityPercentage { get; set; }      // Влажность
        public decimal? DewPoint { get; set; }                // Точка росы
        
        // Давление
        public decimal? PressureHpa { get; set; }             // Давление в гПа
        public decimal? PressureQNHHpa { get; set; }          // Давление QNH в гПа
        public decimal? PressureMmHg { get; set; }            // Давление в мм рт. ст.
        
        // Ветер
        public decimal? WindSpeed { get; set; }               // Скорость ветра
        public decimal? WindDirection { get; set; }           // Направление ветра
        public decimal? WindVSound { get; set; }              // Скорость звука ветра
        
        // Осадки
        public int? PrecipitationType { get; set; }           // Тип осадков
        public decimal? PrecipitationIntensity { get; set; }  // Интенсивность осадков
        public decimal? PrecipitationQuantity { get; set; }   // Количество осадков
        public int? PrecipitationElapsed { get; set; }        // Прошедшее время осадков
        public int? PrecipitationPeriod { get; set; }         // Период осадков
        
        // Газовый состав
        public decimal? Co2Level { get; set; }                // Уровень CO2
        
        // Электрика
        public decimal? SupplyVoltage { get; set; }           // Напряжение питания
        
        // GPS и позиционирование
        public decimal? IwsLatitude { get; set; }             // Широта IWS
        public decimal? IwsLongitude { get; set; }            // Долгота IWS
        public decimal? Altitude { get; set; }                // Высота
        public decimal? GpsSpeed { get; set; }                // Скорость по GPS
        
        // Движение и ориентация
        public int? KspValue { get; set; }                    // KSP значение
        public decimal? AccelerationStdDev { get; set; }      // Стандартное отклонение ускорения
        public decimal? RollAngle { get; set; }               // Угол крена
        public decimal? PitchAngle { get; set; }              // Угол тангажа
        
        // Статус
        public int? StatusOk { get; set; }                    // Статус OK
    }

    public class IWSDataViewModel
    {
        public int SensorId { get; set; }
        public string SerialNumber { get; set; }
        public string EndpointName { get; set; }
        public string PostName { get; set; }
        public List<IWSMeasurementViewModel> Measurements { get; set; }
    }

    public class IWSParameterInfo
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Unit { get; set; }
        public string Color { get; set; }
        public string PropertyName { get; set; }
        public bool Visible { get; set; }
        public int Order { get; set; }
        public string Group { get; set; } // Группа параметров
        public string Icon { get; set; }   // Иконка FontAwesome
    }
}