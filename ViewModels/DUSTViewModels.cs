using System;
using System.Collections.Generic;

namespace GraphsAndChartsApp.ViewModels
{
    public class DUSTMeasurementViewModel
    {
        public int DustDataId { get; set; }
        public DateTime DataTimestamp { get; set; }
        
        // Актуальные значения (мг/м³)
        public decimal? Pm10Act { get; set; }        // PM10 актуальное
        public decimal? Pm25Act { get; set; }        // PM2.5 актуальное
        public decimal? Pm1Act { get; set; }         // PM1 актуальное
        
        // Средние значения (мг/м³)
        public decimal? Pm10Awg { get; set; }        // PM10 среднее
        public decimal? Pm25Awg { get; set; }        // PM2.5 среднее
        public decimal? Pm1Awg { get; set; }         // PM1 среднее
        
        // Технические параметры
        public decimal? FlowProbe { get; set; }      // Поток пробы
        public decimal? TemperatureProbe { get; set; } // Температура пробы
        public decimal? HumidityProbe { get; set; }  // Влажность пробы
        public int? LaserStatus { get; set; }        // Статус лазера
        public decimal? SupplyVoltage { get; set; }  // Напряжение питания
    }

    public class DUSTDataViewModel
    {
        public int SensorId { get; set; }
        public string SerialNumber { get; set; }
        public string EndpointName { get; set; }
        public string PostName { get; set; }
        public List<DUSTMeasurementViewModel> Measurements { get; set; }
    }

    public class DUSTParameterInfo
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Unit { get; set; }
        public string Color { get; set; }
        public string PropertyName { get; set; }
        public bool Visible { get; set; }
        public int Order { get; set; }
        public string Group { get; set; } // Группа параметров
    }
}