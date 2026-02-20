using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;
using GraphsAndChartsApp.Data;
using GraphsAndChartsApp.Models;
using GraphsAndChartsApp.ViewModels;
using Microsoft.AspNetCore.Mvc.Rendering;
using Npgsql;
using System;
using System.Collections.Generic;

namespace GraphsAndChartsApp.Controllers
{
    public class GraphsAndChartsController : Controller
    {
        private readonly ApplicationDbContext _context;

        public GraphsAndChartsController(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IActionResult> Index()
        {
            var viewModel = new SensorSelectionViewModel();

            var monitoringPosts = await _context.MonitoringPosts
                .Where(mp => mp.IsActive)
                .OrderBy(mp => mp.Name)
                .ToListAsync();

            viewModel.MonitoringPosts = monitoringPosts
                .Select(mp => new SelectListItem
                {
                    Value = mp.Id.ToString(),
                    Text = mp.Name
                })
                .ToList();

            viewModel.MonitoringPosts.Insert(0, new SelectListItem
            {
                Value = "",
                Text = "Выберите пост мониторинга"
            });

            viewModel.Sensors = new List<SelectListItem>
            {
                new SelectListItem
                {
                    Value = "",
                    Text = "Сначала выберите пост мониторинга"
                }
            };

            return View(viewModel);
        }

        [HttpGet]
        public async Task<IActionResult> GetSensorsByPost(int monitoringPostId)
        {
            var sensors = await _context.Sensors
                .Include(s => s.SensorType)
                .Where(s => s.MonitoringPostId == monitoringPostId && s.IsActive)
                .OrderBy(s => s.SensorType != null ? s.SensorType.SensorTypeName : "")
                .ThenBy(s => s.EndPointsName)
                .ToListAsync();

            var sensorItems = sensors
                .Select(s => new SelectListItem
                {
                    Value = s.Id.ToString(),
                    Text = $"{s.SensorType?.SensorTypeName} {s.EndPointsName} {s.SerialNumber}"
                })
                .ToList();

            sensorItems.Insert(0, new SelectListItem
            {
                Value = "",
                Text = "Выберите сенсор"
            });

            return Json(sensorItems);
        }

        [HttpGet]
        public async Task<IActionResult> GetSensorData(int sensorId)
        {
            var sensor = await _context.Sensors
                .Include(s => s.SensorType)
                .Include(s => s.MonitoringPost)
                .FirstOrDefaultAsync(s => s.Id == sensorId);

            if (sensor == null || sensor.SensorType == null)
            {
                return NotFound();
            }

            var viewModel = new SensorViewModel
            {
                Id = sensor.Id,
                SensorTypeName = sensor.SensorType.SensorTypeName,
                EndPointsName = sensor.EndPointsName,
                SerialNumber = sensor.SerialNumber,
                MonitoringPostName = sensor.MonitoringPost?.Name
            };

            return sensor.SensorType.SensorTypeName switch
            {
                "DSPD" => PartialView("_DSPDPartial", viewModel),
                "IWS" => PartialView("_IWSPartial", viewModel),
                "DOV" => PartialView("_DOVPartial", viewModel),
                "DUST" => PartialView("_DUSTPartial", viewModel),
                "MUEKS" => PartialView("_MUEKSPartial", viewModel),
                _ => PartialView("_DefaultPartial", viewModel)
            };
        }

        // ==================== DOV МЕТОДЫ ====================
        
        [HttpGet]
        public async Task<IActionResult> GetDOVData(int sensorId, int days = 1)
        {
            try
            {
                var fromDate = DateTime.UtcNow.AddDays(-days);
                
                var connectionString = _context.Database.GetConnectionString();
                
                var query = @"
                    SELECT 
                        dov_data_id AS DovDataId,
                         received_at AS ReceivedAt,
                        data_timestamp AS DataTimestamp,
                        visible_range AS VisibleRange,
                        bright_flag AS BrightFlag
                    FROM public.vw_dov_data_full 
                    WHERE sensor_id = @sensorId 
                        AND received_at >= @fromDate
                    ORDER BY received_at ASC";
                
                var measurements = new List<DOVMeasurementViewModel>();
                
                using (var connection = new NpgsqlConnection(connectionString))
                {
                    using (var command = new NpgsqlCommand(query, connection))
                    {
                        command.Parameters.AddWithValue("@sensorId", sensorId);
                        command.Parameters.AddWithValue("@fromDate", fromDate);
                        
                        await connection.OpenAsync();
                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                measurements.Add(new DOVMeasurementViewModel
                                {
                                    DovDataId = reader.GetInt32(reader.GetOrdinal("DovDataId")),
                                    DataTimestamp = reader.GetDateTime(reader.GetOrdinal("DataTimestamp")),
                                    VisibleRange = reader.GetDecimal(reader.GetOrdinal("VisibleRange")),
                                    BrightFlag = reader.GetInt32(reader.GetOrdinal("BrightFlag"))
                                });
                            }
                        }
                    }
                }

                var sensor = await _context.Sensors
                    .Include(s => s.SensorType)
                    .Include(s => s.MonitoringPost)
                    .FirstOrDefaultAsync(s => s.Id == sensorId);

                var viewModel = new DOVDataViewModel
                {
                    SensorId = sensorId,
                    SerialNumber = sensor?.SerialNumber ?? "",
                    EndpointName = sensor?.EndPointsName ?? "",
                    PostName = sensor?.MonitoringPost?.Name,
                    Measurements = measurements
                };

                return Json(viewModel);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Ошибка при загрузке данных DOV: {ex.Message}");
                return StatusCode(500, new { error = "Ошибка при загрузке данных" });
            }
        }

        // ==================== DSPD МЕТОДЫ ====================
        
        [HttpGet]
        public async Task<IActionResult> GetDSPDData(int sensorId, int days = 1)
        {
            try
            {
                var fromDate = DateTime.UtcNow.AddDays(-days);
                
                var connectionString = _context.Database.GetConnectionString();
                
                var query = @"
                    SELECT 
                        dspd_data_id AS DspdDataId,
                         received_at AS ReceivedAt,
                        data_timestamp AS DataTimestamp,
                        grip_coefficient AS GripCoefficient,
                        shake_level AS ShakeLevel,
                        voltage_power AS VoltagePower,
                        case_temperature AS CaseTemperature,
                        road_temperature AS RoadTemperature,
                        water_height AS WaterHeight,
                        ice_height AS IceHeight,
                        snow_height AS SnowHeight,
                        ice_percentage AS IcePercentage,
                        pgm_percentage AS PgmPercentage,
                        road_status_code AS RoadStatusCode,
                        road_angle AS RoadAngle,
                        freeze_temperature AS FreezeTemperature,
                        distance_to_surface AS DistanceToSurface,
                        calibration_needed AS CalibrationNeeded,
                        gps_latitude AS GpsLatitude,
                        gps_longitude AS GpsLongitude,
                        gps_valid AS GpsValid
                    FROM public.vw_dspd_data_full 
                    WHERE sensor_id = @sensorId 
                        AND received_at >= @fromDate
                    ORDER BY received_at ASC";
                
                var measurements = new List<DSPDMeasurementViewModel>();
                
                using (var connection = new NpgsqlConnection(connectionString))
                {
                    using (var command = new NpgsqlCommand(query, connection))
                    {
                        command.Parameters.AddWithValue("@sensorId", sensorId);
                        command.Parameters.AddWithValue("@fromDate", fromDate);
                        
                        await connection.OpenAsync();
                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                var measurement = new DSPDMeasurementViewModel
                                {
                                    DspdDataId = reader.GetInt32(reader.GetOrdinal("DspdDataId")),
                                    DataTimestamp = reader.GetDateTime(reader.GetOrdinal("DataTimestamp")),
                                    GripCoefficient = GetDecimalOrNull(reader, "GripCoefficient"),
                                    ShakeLevel = GetDecimalOrNull(reader, "ShakeLevel"),
                                    VoltagePower = GetDecimalOrNull(reader, "VoltagePower"),
                                    CaseTemperature = GetDecimalOrNull(reader, "CaseTemperature"),
                                    RoadTemperature = GetDecimalOrNull(reader, "RoadTemperature"),
                                    WaterHeight = GetDecimalOrNull(reader, "WaterHeight"),
                                    IceHeight = GetDecimalOrNull(reader, "IceHeight"),
                                    SnowHeight = GetDecimalOrNull(reader, "SnowHeight"),
                                    IcePercentage = GetDecimalOrNull(reader, "IcePercentage"),
                                    PgmPercentage = GetDecimalOrNull(reader, "PgmPercentage"),
                                    RoadStatusCode = GetInt32OrNull(reader, "RoadStatusCode"),
                                    RoadAngle = GetDecimalOrNull(reader, "RoadAngle"),
                                    FreezeTemperature = GetDecimalOrNull(reader, "FreezeTemperature"),
                                    DistanceToSurface = GetDecimalOrNull(reader, "DistanceToSurface"),
                                    CalibrationNeeded = GetInt32OrNull(reader, "CalibrationNeeded"),
                                    GpsLatitude = GetDecimalOrNull(reader, "GpsLatitude"),
                                    GpsLongitude = GetDecimalOrNull(reader, "GpsLongitude"),
                                    GpsValid = GetBooleanOrNull(reader, "GpsValid")
                                };
                                
                                measurements.Add(measurement);
                            }
                        }
                    }
                }

                var sensor = await _context.Sensors
                    .Include(s => s.SensorType)
                    .Include(s => s.MonitoringPost)
                    .FirstOrDefaultAsync(s => s.Id == sensorId);

                var viewModel = new DSPDDataViewModel
                {
                    SensorId = sensorId,
                    SerialNumber = sensor?.SerialNumber ?? "",
                    EndpointName = sensor?.EndPointsName ?? "",
                    PostName = sensor?.MonitoringPost?.Name,
                    Measurements = measurements
                };

                return Json(viewModel);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Ошибка при загрузке данных DSPD: {ex.Message}");
                return StatusCode(500, new { error = "Ошибка при загрузке данных" });
            }
        }


// ==================== DUST МЕТОДЫ ====================

        [HttpGet]
        public async Task<IActionResult> GetDUSTData(int sensorId, int days = 1)
        {
            try
            {
                var fromDate = DateTime.UtcNow.AddDays(-days);
                
                var connectionString = _context.Database.GetConnectionString();
                
                var query = @"
                    SELECT 
                        dust_data_id AS DustDataId,
                        received_at AS ReceivedAt,
                        data_timestamp AS DataTimestamp,
                        pm10act AS Pm10Act,
                        pm25act AS Pm25Act,
                        pm1act AS Pm1Act,
                        pm10awg AS Pm10Awg,
                        pm25awg AS Pm25Awg,
                        pm1awg AS Pm1Awg,
                        flowprobe AS FlowProbe,
                        temperatureprobe AS TemperatureProbe,
                        humidityprobe AS HumidityProbe,
                        laserstatus AS LaserStatus,
                        supplyvoltage AS SupplyVoltage
                    FROM public.vw_dust_data_full 
                    WHERE sensor_id = @sensorId 
                        AND received_at >= @fromDate
                    ORDER BY received_at ASC";
                
                var measurements = new List<DUSTMeasurementViewModel>();
                
                using (var connection = new NpgsqlConnection(connectionString))
                {
                    using (var command = new NpgsqlCommand(query, connection))
                    {
                        command.Parameters.AddWithValue("@sensorId", sensorId);
                        command.Parameters.AddWithValue("@fromDate", fromDate);
                        
                        await connection.OpenAsync();
                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                var measurement = new DUSTMeasurementViewModel
                                {
                                    DustDataId = reader.GetInt32(reader.GetOrdinal("DustDataId")),
                                    DataTimestamp = reader.GetDateTime(reader.GetOrdinal("DataTimestamp")),
                                    Pm10Act = GetDecimalOrNull(reader, "Pm10Act"),
                                    Pm25Act = GetDecimalOrNull(reader, "Pm25Act"),
                                    Pm1Act = GetDecimalOrNull(reader, "Pm1Act"),
                                    Pm10Awg = GetDecimalOrNull(reader, "Pm10Awg"),
                                    Pm25Awg = GetDecimalOrNull(reader, "Pm25Awg"),
                                    Pm1Awg = GetDecimalOrNull(reader, "Pm1Awg"),
                                    FlowProbe = GetDecimalOrNull(reader, "FlowProbe"),
                                    TemperatureProbe = GetDecimalOrNull(reader, "TemperatureProbe"),
                                    HumidityProbe = GetDecimalOrNull(reader, "HumidityProbe"),
                                    LaserStatus = GetInt32OrNull(reader, "LaserStatus"),
                                    SupplyVoltage = GetDecimalOrNull(reader, "SupplyVoltage")
                                };
                                
                                measurements.Add(measurement);
                            }
                        }
                    }
                }

                var sensor = await _context.Sensors
                    .Include(s => s.SensorType)
                    .Include(s => s.MonitoringPost)
                    .FirstOrDefaultAsync(s => s.Id == sensorId);

                var viewModel = new DUSTDataViewModel
                {
                    SensorId = sensorId,
                    SerialNumber = sensor?.SerialNumber ?? "",
                    EndpointName = sensor?.EndPointsName ?? "",
                    PostName = sensor?.MonitoringPost?.Name,
                    Measurements = measurements
                };

                return Json(viewModel);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Ошибка при загрузке данных DUST: {ex.Message}");
                return StatusCode(500, new { error = "Ошибка при загрузке данных" });
            }
        }

        // ==================== IWS МЕТОДЫ ====================

        [HttpGet]
        public async Task<IActionResult> GetIWSData(int sensorId, int days = 1)
        {
            try
            {
                var fromDate = DateTime.UtcNow.AddDays(-days);
                
                var connectionString = _context.Database.GetConnectionString();
                
                var query = @"
                    SELECT 
                        iws_data_id AS IwsDataId,
                        received_at AS ReceivedAt,
                        data_timestamp AS DataTimestamp,
                        environment_temperature AS EnvironmentTemperature,
                        humidity_percentage AS HumidityPercentage,
                        dew_point AS DewPoint,
                        pressure_hpa AS PressureHpa,
                        pressure_qnh_hpa AS PressureQNHHpa,
                        pressure_mmhg AS PressureMmHg,
                        wind_speed AS WindSpeed,
                        wind_direction AS WindDirection,
                        wind_vs_sound AS WindVSound,
                        precipitation_type AS PrecipitationType,
                        precipitation_intensity AS PrecipitationIntensity,
                        precipitation_quantity AS PrecipitationQuantity,
                        precipitation_elapsed AS PrecipitationElapsed,
                        precipitation_period AS PrecipitationPeriod,
                        co2_level AS Co2Level,
                        supply_voltage AS SupplyVoltage,
                        iws_latitude AS IwsLatitude,
                        iws_longitude AS IwsLongitude,
                        altitude AS Altitude,
                        ksp_value AS KspValue,
                        gps_speed AS GpsSpeed,
                        acceleration_std_dev AS AccelerationStdDev,
                        roll_angle AS RollAngle,
                        pitch_angle AS PitchAngle,
                        status_ok AS StatusOk
                    FROM public.vw_iws_data_full 
                    WHERE sensor_id = @sensorId 
                        AND received_at >= @fromDate
                    ORDER BY received_at ASC";
                
                var measurements = new List<IWSMeasurementViewModel>();
                
                using (var connection = new NpgsqlConnection(connectionString))
                {
                    using (var command = new NpgsqlCommand(query, connection))
                    {
                        command.Parameters.AddWithValue("@sensorId", sensorId);
                        command.Parameters.AddWithValue("@fromDate", fromDate);
                        
                        await connection.OpenAsync();
                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                var measurement = new IWSMeasurementViewModel
                                {
                                    IwsDataId = reader.GetInt32(reader.GetOrdinal("IwsDataId")),
                                    DataTimestamp = reader.GetDateTime(reader.GetOrdinal("DataTimestamp")),
                                    
                                    EnvironmentTemperature = GetDecimalOrNull(reader, "EnvironmentTemperature"),
                                    HumidityPercentage = GetDecimalOrNull(reader, "HumidityPercentage"),
                                    DewPoint = GetDecimalOrNull(reader, "DewPoint"),
                                    
                                    PressureHpa = GetDecimalOrNull(reader, "PressureHpa"),
                                    PressureQNHHpa = GetDecimalOrNull(reader, "PressureQNHHpa"),
                                    PressureMmHg = GetDecimalOrNull(reader, "PressureMmHg"),
                                    
                                    WindSpeed = GetDecimalOrNull(reader, "WindSpeed"),
                                    WindDirection = GetDecimalOrNull(reader, "WindDirection"),
                                    WindVSound = GetDecimalOrNull(reader, "WindVSound"),
                                    
                                    PrecipitationType = GetInt32OrNull(reader, "PrecipitationType"),
                                    PrecipitationIntensity = GetDecimalOrNull(reader, "PrecipitationIntensity"),
                                    PrecipitationQuantity = GetDecimalOrNull(reader, "PrecipitationQuantity"),
                                    PrecipitationElapsed = GetInt32OrNull(reader, "PrecipitationElapsed"),
                                    PrecipitationPeriod = GetInt32OrNull(reader, "PrecipitationPeriod"),
                                    
                                    Co2Level = GetDecimalOrNull(reader, "Co2Level"),
                                    SupplyVoltage = GetDecimalOrNull(reader, "SupplyVoltage"),
                                    
                                    IwsLatitude = GetDecimalOrNull(reader, "IwsLatitude"),
                                    IwsLongitude = GetDecimalOrNull(reader, "IwsLongitude"),
                                    Altitude = GetDecimalOrNull(reader, "Altitude"),
                                    
                                    KspValue = GetInt32OrNull(reader, "KspValue"),
                                    GpsSpeed = GetDecimalOrNull(reader, "GpsSpeed"),
                                    AccelerationStdDev = GetDecimalOrNull(reader, "AccelerationStdDev"),
                                    RollAngle = GetDecimalOrNull(reader, "RollAngle"),
                                    PitchAngle = GetDecimalOrNull(reader, "PitchAngle"),
                                    
                                    StatusOk = GetInt32OrNull(reader, "StatusOk")
                                };
                                
                                measurements.Add(measurement);
                            }
                        }
                    }
                }

                var sensor = await _context.Sensors
                    .Include(s => s.SensorType)
                    .Include(s => s.MonitoringPost)
                    .FirstOrDefaultAsync(s => s.Id == sensorId);

                var viewModel = new IWSDataViewModel
                {
                    SensorId = sensorId,
                    SerialNumber = sensor?.SerialNumber ?? "",
                    EndpointName = sensor?.EndPointsName ?? "",
                    PostName = sensor?.MonitoringPost?.Name,
                    Measurements = measurements
                };

                return Json(viewModel);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Ошибка при загрузке данных IWS: {ex.Message}");
                return StatusCode(500, new { error = "Ошибка при загрузке данных" });
            }
        }

        // ==================== MUEKS МЕТОДЫ ====================

        [HttpGet]
        public async Task<IActionResult> GetMUEKSData(int sensorId, int days = 1)
        {
            try
            {
                var fromDate = DateTime.UtcNow.AddDays(-days);
                
                var connectionString = _context.Database.GetConnectionString();
                
                var query = @"
                    SELECT 
                        mueks_data_id AS MueksDataId,
                        received_at AS ReceivedAt,
                        data_timestamp AS DataTimestamp,
                        temperature_box AS TemperatureBox,
                        voltage_power_in_12b AS VoltagePowerIn12b,
                        voltage_out_12b AS VoltageOut12b,
                        current_out_12b AS CurrentOut12b,
                        current_out_48b AS CurrentOut48b,
                        voltage_akb AS VoltageAkb,
                        current_akb AS CurrentAkb,
                        sensor_220b AS Sensor220b,
                        watt_hours_akb AS WattHoursAkb,
                        visible_range AS VisibleRange,
                        door_status AS DoorStatus,
                        tds_h AS TdsH,
                        tds_tds AS TdsTds,
                        tkosa_t1 AS TkosaT1,
                        tkosa_t3 AS TkosaT3
                    FROM public.vw_mueks_data_full 
                    WHERE sensor_id = @sensorId 
                        AND received_at >= @fromDate
                    ORDER BY received_at ASC";
                
                var measurements = new List<MUEKSMeasurementViewModel>();
                
                using (var connection = new NpgsqlConnection(connectionString))
                {
                    using (var command = new NpgsqlCommand(query, connection))
                    {
                        command.Parameters.AddWithValue("@sensorId", sensorId);
                        command.Parameters.AddWithValue("@fromDate", fromDate);
                        
                        await connection.OpenAsync();
                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                var measurement = new MUEKSMeasurementViewModel
                                {
                                    MueksDataId = reader.GetInt32(reader.GetOrdinal("MueksDataId")),
                                    DataTimestamp = reader.GetDateTime(reader.GetOrdinal("DataTimestamp")),
                                    
                                    TemperatureBox = GetDecimalOrNull(reader, "TemperatureBox"),
                                    VoltagePowerIn12b = GetDecimalOrNull(reader, "VoltagePowerIn12b"),
                                    VoltageOut12b = GetDecimalOrNull(reader, "VoltageOut12b"),
                                    CurrentOut12b = GetDecimalOrNull(reader, "CurrentOut12b"),
                                    CurrentOut48b = GetDecimalOrNull(reader, "CurrentOut48b"),
                                    VoltageAkb = GetDecimalOrNull(reader, "VoltageAkb"),
                                    CurrentAkb = GetDecimalOrNull(reader, "CurrentAkb"),
                                    Sensor220b = GetInt32OrNull(reader, "Sensor220b"),
                                    WattHoursAkb = GetDecimalOrNull(reader, "WattHoursAkb"),
                                    VisibleRange = GetDecimalOrNull(reader, "VisibleRange"),
                                    DoorStatus = GetInt32OrNull(reader, "DoorStatus"),
                                    
                                    TdsH = GetStringOrNull(reader, "TdsH"),
                                    TdsTds = GetStringOrNull(reader, "TdsTds"),
                                    TkosaT1 = GetStringOrNull(reader, "TkosaT1"),
                                    TkosaT3 = GetStringOrNull(reader, "TkosaT3")
                                };
                                
                                measurements.Add(measurement);
                            }
                        }
                    }
                }

                var sensor = await _context.Sensors
                    .Include(s => s.SensorType)
                    .Include(s => s.MonitoringPost)
                    .FirstOrDefaultAsync(s => s.Id == sensorId);

                var viewModel = new MUEKSDataViewModel
                {
                    SensorId = sensorId,
                    SerialNumber = sensor?.SerialNumber ?? "",
                    EndpointName = sensor?.EndPointsName ?? "",
                    PostName = sensor?.MonitoringPost?.Name,
                    Measurements = measurements
                };

                return Json(viewModel);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Ошибка при загрузке данных MUEKS: {ex.Message}");
                return StatusCode(500, new { error = "Ошибка при загрузке данных" });
            }
        }

        // Добавьте вспомогательный метод для чтения строк
        private string GetStringOrNull(NpgsqlDataReader reader, string columnName)
        {
            var ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
        }
        // Вспомогательные методы для безопасного чтения NULL значений
        private decimal? GetDecimalOrNull(NpgsqlDataReader reader, string columnName)
        {
            var ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? (decimal?)null : reader.GetDecimal(ordinal);
        }

        private int? GetInt32OrNull(NpgsqlDataReader reader, string columnName)
        {
            var ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? (int?)null : reader.GetInt32(ordinal);
        }

        private bool? GetBooleanOrNull(NpgsqlDataReader reader, string columnName)
        {
            var ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? (bool?)null : reader.GetBoolean(ordinal);
        }
    }
}