using System;
using System.Collections.Generic;

namespace GraphsAndChartsApp.ViewModels
{
    public class MUEKSMeasurementViewModel
    {
        public int MueksDataId { get; set; }
        public DateTime DataTimestamp { get; set; }
        
        // Температура
        public decimal? TemperatureBox { get; set; }           // Температура в шкафу
        
        // Напряжения
        public decimal? VoltagePowerIn12b { get; set; }        // Напряжение питания входа 12В
        public decimal? VoltageOut12b { get; set; }            // Напряжение выхода 12В
        public decimal? VoltageAkb { get; set; }               // Напряжение АКБ
        
        // Токи
        public decimal? CurrentOut12b { get; set; }            // Ток выхода 12В
        public decimal? CurrentOut48b { get; set; }            // Ток выхода 48В
        public decimal? CurrentAkb { get; set; }               // Ток АКБ
        
        // Энергия
        public decimal? WattHoursAkb { get; set; }             // Ватт-часы АКБ
        public decimal? VisibleRange { get; set; }             // Видимый диапазон
        
        // Статусы
        public int? Sensor220b { get; set; }                   // Датчик 220В
        public int? DoorStatus { get; set; }                   // Статус двери
        
        // TDS параметры (текстовые)
        public string TdsH { get; set; }                        // TDS H
        public string TdsTds { get; set; }                      // TDS TDS
        public string TkosaT1 { get; set; }                     // TKOСА T1
        public string TkosaT3 { get; set; }                     // TKOСА T3
    }

    public class MUEKSDataViewModel
    {
        public int SensorId { get; set; }
        public string SerialNumber { get; set; }
        public string EndpointName { get; set; }
        public string PostName { get; set; }
        public List<MUEKSMeasurementViewModel> Measurements { get; set; }
    }

    public class MUEKSParameterInfo
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Unit { get; set; }
        public string Color { get; set; }
        public string PropertyName { get; set; }
        public bool Visible { get; set; }
        public int Order { get; set; }
        public string Group { get; set; }
        public string Icon { get; set; }
        public bool IsText { get; set; } // Для текстовых параметров (TDS)
    }
}