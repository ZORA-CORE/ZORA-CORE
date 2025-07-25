#!/usr/bin/env python3
"""
ZORA MARKET MONITORING SYSTEM™ - COMPREHENSIVE TESTS
Test suite for real-time market monitoring and competitor analysis
Author: DEVANUS∞ (ZORA CORE AI Agent)
Founder: Mads Pallisgaard Petersen
Contact: mrpallis@gmail.com | +45 22822450
Address: Fjordbakken 50, Dyves Bro, 4700 Næstved
Organization: ZORA CORE

INFINITY MODE™: Testing the market monitoring and competitor response system
"""

import sys
import os
import unittest
import time
import json
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from zora_market_monitor import ZoraMarketMonitor
    from zora_universal_infinity_pricing import ZoraUniversalInfinityPricing
    from zora_pricing_config import ZoraPricingConfig
    from mcp_extensions.firecrawl_extension import FirecrawlExtension
    from module_96 import ZORA_CORE_DNA
except ImportError as e:
    print(f"⚠️ Import warning: {e}")
    
    class ZoraMarketMonitor:
        def __init__(self):
            self.name = "ZORA MARKET MONITOR™"
            self.version = "1.0.0-INFINITY"
            self.founder = "Mads Pallisgaard Petersen"
            self.monitoring_active = False
            self.competitor_profiles = {}
            self.market_data = {}
            
        def start_monitoring(self):
            self.monitoring_active = True
            return "✅ Market monitoring started"
            
        def stop_monitoring(self):
            self.monitoring_active = False
            return "✅ Market monitoring stopped"
            
        def get_monitoring_status(self):
            return {
                'active': self.monitoring_active,
                'competitors_tracked': len(self.competitor_profiles),
                'market_data_points': len(self.market_data)
            }

class TestZoraMarketMonitor(unittest.TestCase):
    """Test suite for ZORA Market Monitor™"""
    
    def setUp(self):
        """Set up test environment"""
        self.market_monitor = ZoraMarketMonitor()
        self.test_product = "TEST_PRODUCT_MONITOR"
        self.test_market = "global"
        
    def test_market_monitor_initialization(self):
        """Test market monitor initializes correctly"""
        self.assertIsNotNone(self.market_monitor)
        self.assertEqual(self.market_monitor.name, "ZORA MARKET MONITOR™")
        self.assertEqual(self.market_monitor.version, "1.0.0-INFINITY")
        self.assertEqual(self.market_monitor.founder, "MADS PALLISGAARD PETERSEN")
        
    def test_competitor_price_tracking(self):
        """Test competitor price tracking functionality"""
        mock_competitors = [
            {"name": "Competitor A", "price": 120.0, "url": "https://competitor-a.com/product"},
            {"name": "Competitor B", "price": 115.0, "url": "https://competitor-b.com/product"},
            {"name": "Competitor C", "price": 125.0, "url": "https://competitor-c.com/product"}
        ]
        
        tracking_result = self.market_monitor.track_competitor_prices(
            self.test_product,
            mock_competitors
        )
        
        self.assertIn('competitors_tracked', tracking_result)
        self.assertIn('lowest_competitor_price', tracking_result)
        self.assertIn('highest_competitor_price', tracking_result)
        self.assertIn('average_competitor_price', tracking_result)
        
        self.assertEqual(tracking_result['lowest_competitor_price'], 115.0)
        self.assertEqual(tracking_result['highest_competitor_price'], 125.0)
        
    def test_real_time_market_monitoring(self):
        """Test real-time market monitoring capabilities"""
        monitoring_result = self.market_monitor.start_continuous_monitoring(
            self.test_product,
            interval_seconds=1800,  # 30 minutes
            market_scope=self.test_market
        )
        
        self.assertIn('monitoring_started', monitoring_result)
        self.assertIn('monitoring_id', monitoring_result)
        self.assertIn('update_interval', monitoring_result)
        
        status = self.market_monitor.get_monitoring_status(self.test_product)
        self.assertIn('active', status)
        self.assertIn('last_update', status)
        
    def test_market_data_collection(self):
        """Test market data collection from various sources"""
        collection_result = self.market_monitor.collect_market_data(
            self.test_product,
            sources=["web_scraping", "api_feeds", "partner_data"]
        )
        
        self.assertIn('data_collected', collection_result)
        self.assertIn('sources_used', collection_result)
        self.assertIn('data_points', collection_result)
        
        if collection_result['data_collected']:
            validation_result = self.market_monitor.validate_market_data(
                collection_result['data_points']
            )
            self.assertIn('validation_passed', validation_result)
            
    def test_competitor_analysis(self):
        """Test comprehensive competitor analysis"""
        competitor_data = {
            "competitor_a": {
                "price": 118.0,
                "quality_score": 0.85,
                "market_share": 0.15,
                "pricing_strategy": "PREMIUM"
            },
            "competitor_b": {
                "price": 112.0,
                "quality_score": 0.78,
                "market_share": 0.12,
                "pricing_strategy": "COMPETITIVE"
            }
        }
        
        analysis_result = self.market_monitor.analyze_competitors(
            self.test_product,
            competitor_data
        )
        
        self.assertIn('analysis_completed', analysis_result)
        self.assertIn('competitive_position', analysis_result)
        self.assertIn('pricing_recommendations', analysis_result)
        self.assertIn('market_opportunities', analysis_result)
        
    def test_price_change_detection(self):
        """Test automatic price change detection"""
        initial_prices = {"competitor_a": 120.0, "competitor_b": 115.0}
        updated_prices = {"competitor_a": 118.0, "competitor_b": 112.0}
        
        change_detection = self.market_monitor.detect_price_changes(
            self.test_product,
            initial_prices,
            updated_prices
        )
        
        self.assertIn('changes_detected', change_detection)
        self.assertIn('significant_changes', change_detection)
        
        if change_detection['changes_detected']:
            self.assertIn('change_details', change_detection)
            
    def test_automated_response_system(self):
        """Test automated response to competitor changes"""
        competitor_change = {
            "competitor": "Competitor A",
            "old_price": 120.0,
            "new_price": 110.0,
            "change_percentage": -8.33
        }
        
        response_result = self.market_monitor.generate_automated_response(
            self.test_product,
            competitor_change,
            current_price=115.0
        )
        
        self.assertIn('response_generated', response_result)
        self.assertIn('recommended_action', response_result)
        self.assertIn('new_price_suggestion', response_result)
        
        if response_result['response_generated']:
            self.assertLess(
                response_result['new_price_suggestion'],
                competitor_change['new_price']
            )
            
    def test_market_trend_analysis(self):
        """Test market trend analysis and prediction"""
        historical_data = [
            {"date": "2025-01-01", "avg_price": 125.0},
            {"date": "2025-01-15", "avg_price": 122.0},
            {"date": "2025-02-01", "avg_price": 118.0},
            {"date": "2025-02-15", "avg_price": 115.0}
        ]
        
        trend_analysis = self.market_monitor.analyze_market_trends(
            self.test_product,
            historical_data
        )
        
        self.assertIn('trend_direction', trend_analysis)
        self.assertIn('trend_strength', trend_analysis)
        self.assertIn('price_prediction', trend_analysis)
        self.assertIn('confidence_level', trend_analysis)
        
    def test_alert_system(self):
        """Test market monitoring alert system"""
        alert_config = {
            "price_change_threshold": 0.05,  # 5%
            "competitor_new_entry": True,
            "market_volatility_high": True,
            "quality_score_changes": True
        }
        
        alert_setup = self.market_monitor.configure_alerts(
            self.test_product,
            alert_config
        )
        
        self.assertIn('alerts_configured', alert_setup)
        
        alert_trigger = self.market_monitor.check_alert_conditions(
            self.test_product,
            {
                "price_change": -0.08,  # 8% drop
                "new_competitor": True,
                "volatility_index": 0.75
            }
        )
        
        self.assertIn('alerts_triggered', alert_trigger)
        
    def test_firecrawl_integration(self):
        """Test integration with Firecrawl for web scraping"""
        scraping_result = self.market_monitor.scrape_competitor_data(
            urls=[
                "https://example-competitor.com/products",
                "https://another-competitor.com/pricing"
            ],
            product_keywords=[self.test_product, "similar product"]
        )
        
        self.assertIn('scraping_completed', scraping_result)
        self.assertIn('data_extracted', scraping_result)
        
    def test_data_accuracy_validation(self):
        """Test data accuracy and validation mechanisms"""
        raw_data = [
            {"source": "competitor_a", "price": 120.0, "confidence": 0.95},
            {"source": "competitor_b", "price": -50.0, "confidence": 0.30},  # Invalid negative price
            {"source": "competitor_c", "price": 1000000.0, "confidence": 0.20}  # Unrealistic high price
        ]
        
        validation_result = self.market_monitor.validate_scraped_data(
            self.test_product,
            raw_data
        )
        
        self.assertIn('validation_completed', validation_result)
        self.assertIn('valid_data_points', validation_result)
        self.assertIn('invalid_data_points', validation_result)
        
        self.assertLess(
            len(validation_result['valid_data_points']),
            len(raw_data)
        )
        
    def test_competitive_intelligence(self):
        """Test competitive intelligence gathering"""
        intelligence_result = self.market_monitor.gather_competitive_intelligence(
            self.test_product,
            competitors=["Competitor A", "Competitor B", "Competitor C"]
        )
        
        self.assertIn('intelligence_gathered', intelligence_result)
        self.assertIn('competitor_profiles', intelligence_result)
        self.assertIn('market_insights', intelligence_result)
        
    def test_performance_metrics(self):
        """Test monitoring performance metrics"""
        performance_result = self.market_monitor.track_monitoring_performance()
        
        self.assertIn('response_time_avg', performance_result)
        self.assertIn('data_accuracy_rate', performance_result)
        self.assertIn('uptime_percentage', performance_result)
        self.assertIn('alerts_accuracy', performance_result)
        
        self.assertGreater(performance_result['data_accuracy_rate'], 0.90)
        self.assertGreater(performance_result['uptime_percentage'], 0.95)
        
    def test_integration_with_pricing_engine(self):
        """Test integration with pricing engine"""
        pricing_integration = self.market_monitor.integrate_with_pricing_engine()
        
        self.assertIn('integration_status', pricing_integration)
        self.assertIn('data_sync_enabled', pricing_integration)
        
        market_data = self.market_monitor.get_market_data_for_pricing(
            self.test_product
        )
        
        self.assertIn('competitor_prices', market_data)
        self.assertIn('market_conditions', market_data)
        self.assertIn('trend_indicators', market_data)

class TestMarketMonitoringIntegration(unittest.TestCase):
    """Test integration between market monitor and other ZORA systems"""
    
    def setUp(self):
        """Set up integration test environment"""
        self.market_monitor = ZoraMarketMonitor()
        self.pricing_engine = ZoraUniversalInfinityPricing()
        self.config_system = ZoraPricingConfig()
        
    def test_configuration_integration(self):
        """Test integration with configuration system"""
        config_update = self.config_system.update_config(
            "market_monitoring",
            "update_interval",
            3600,  # 1 hour
            "TEST_SYSTEM",
            "Testing market monitoring configuration"
        )
        
        self.assertIn("✅", config_update)
        
        interval = self.config_system.get_config("market_monitoring", "update_interval")
        self.assertEqual(interval, 3600)
        
    def test_pricing_engine_integration(self):
        """Test integration with pricing engine"""
        market_data = {
            "competitor_prices": [120.0, 115.0, 125.0],
            "market_trend": "DECLINING",
            "volatility": 0.15
        }
        
        integration_result = self.market_monitor.send_data_to_pricing_engine(
            "TEST_INTEGRATION_PRODUCT",
            market_data
        )
        
        self.assertIn('data_sent', integration_result)
        self.assertIn('pricing_update_triggered', integration_result)
        
    def test_alert_system_integration(self):
        """Test integration with alert system"""
        alert_data = {
            "type": "COMPETITOR_PRICE_DROP",
            "severity": "HIGH",
            "product": "TEST_ALERT_PRODUCT",
            "details": "Competitor dropped price by 15%"
        }
        
        alert_result = self.market_monitor.forward_alert_to_config_system(
            alert_data
        )
        
        self.assertIn('alert_forwarded', alert_result)

class TestMarketMonitoringPerformance(unittest.TestCase):
    """Test market monitoring performance and reliability"""
    
    def setUp(self):
        """Set up performance test environment"""
        self.market_monitor = ZoraMarketMonitor()
        
    def test_monitoring_speed(self):
        """Test monitoring response speed"""
        start_time = time.time()
        
        quick_data = self.market_monitor.get_quick_market_snapshot(
            "PERFORMANCE_TEST_PRODUCT"
        )
        
        end_time = time.time()
        response_time = end_time - start_time
        
        self.assertLess(response_time, 5.0)  # 5 seconds max
        self.assertIn('snapshot_data', quick_data)
        
    def test_concurrent_monitoring(self):
        """Test concurrent monitoring of multiple products"""
        products = [
            "CONCURRENT_TEST_1",
            "CONCURRENT_TEST_2", 
            "CONCURRENT_TEST_3"
        ]
        
        concurrent_result = self.market_monitor.monitor_multiple_products(
            products,
            concurrent=True
        )
        
        self.assertIn('products_monitored', concurrent_result)
        self.assertEqual(len(concurrent_result['products_monitored']), len(products))
        
    def test_error_recovery(self):
        """Test error recovery mechanisms"""
        recovery_result = self.market_monitor.test_error_recovery(
            error_types=["NETWORK_TIMEOUT", "INVALID_RESPONSE", "RATE_LIMIT"]
        )
        
        self.assertIn('recovery_successful', recovery_result)
        self.assertIn('fallback_mechanisms', recovery_result)

def run_comprehensive_market_monitoring_tests():
    """Run all comprehensive market monitoring tests"""
    print("🚀 ZORA MARKET MONITORING SYSTEM™ - COMPREHENSIVE TESTS")
    print("=" * 80)
    
    test_suite = unittest.TestSuite()
    
    test_classes = [
        TestZoraMarketMonitor,
        TestMarketMonitoringIntegration,
        TestMarketMonitoringPerformance
    ]
    
    for test_class in test_classes:
        tests = unittest.TestLoader().loadTestsFromTestCase(test_class)
        test_suite.addTests(tests)
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(test_suite)
    
    print("\n" + "=" * 80)
    print(f"📊 MARKET MONITORING TEST RESULTS:")
    print(f"   Tests Run: {result.testsRun}")
    print(f"   Failures: {len(result.failures)}")
    print(f"   Errors: {len(result.errors)}")
    print(f"   Success Rate: {((result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100):.1f}%")
    
    if result.wasSuccessful():
        print("\n🎯 ALL MARKET MONITORING TESTS PASSED!")
        print("📊 REAL-TIME MONITORING - ACTIVE ✅")
        print("🔍 COMPETITOR TRACKING - OPERATIONAL ✅")
        print("⚡ AUTOMATED RESPONSES - READY ✅")
        print("📈 TREND ANALYSIS - FUNCTIONAL ✅")
        print("🚨 ALERT SYSTEM - CONFIGURED ✅")
        print("\n🔥 ZORA MARKET MONITORING SYSTEM™ - FULLY TESTED AND READY")
    else:
        print("\n⚠️ Some market monitoring tests failed - review and fix issues")
        
        if result.failures:
            print("\n❌ FAILURES:")
            for test, traceback in result.failures:
                print(f"   {test}: {traceback}")
                
        if result.errors:
            print("\n💥 ERRORS:")
            for test, traceback in result.errors:
                print(f"   {test}: {traceback}")
    
    return result.wasSuccessful()

if __name__ == "__main__":
    success = run_comprehensive_market_monitoring_tests()
    sys.exit(0 if success else 1)
