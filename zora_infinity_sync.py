# zora_infinity_sync.py
import time
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, List
from agents import claude, meta_ai, gpt4, codex, sora, supergrok, gemini, copilot, pi, reka
from agents import phind, devin, you, elevenlabs, openai, perplexity, huggingface
from agents import leonardo, midjourney, deepseek, langsmith, github, gitlab, replit
from sync_utils import sync_all, log, websocket_sync, repair

ALL_AGENTS = [
    claude, meta_ai, gpt4, codex, sora, supergrok, gemini, copilot, pi, reka,
    phind, devin, you, elevenlabs, openai, perplexity, huggingface,
    leonardo, midjourney, deepseek, langsmith, github, gitlab, replit
]

AGENT_MONITORING_INTERVAL = 5.0  # 5 seconds as specified in plan
AGENT_PING_TIMEOUT = 10.0
MAX_CONSECUTIVE_FAILURES = 3

agent_health_metrics = {}
agent_failure_counts = {}

logger = logging.getLogger("zora.infinity_sync")
logger.setLevel(logging.INFO)

async def monitor_agent_health(agent, agent_name: str) -> Dict[str, Any]:
    """Monitor individual agent health and report to watchdog"""
    try:
        start_time = time.time()
        
        response = await asyncio.wait_for(
            asyncio.to_thread(agent.ping, "∞ ZORA SYNC CYCLE"),
            timeout=AGENT_PING_TIMEOUT
        )
        
        response_time = time.time() - start_time
        
        health_score = 100.0
        if response_time > 5.0:
            health_score -= 30.0
        elif response_time > 2.0:
            health_score -= 15.0
        
        if not response or not isinstance(response, dict):
            health_score -= 20.0
        elif response.get("status") != "active":
            health_score -= 25.0
        
        agent_health_metrics[agent_name] = {
            "health_score": max(0.0, health_score),
            "response_time": response_time,
            "last_ping": datetime.utcnow(),
            "status": response.get("status", "unknown") if response else "no_response",
            "infinity_ready": response.get("infinity_ready", False) if response else False,
            "consecutive_failures": agent_failure_counts.get(agent_name, 0)
        }
        
        agent_failure_counts[agent_name] = 0
        
        await report_agent_to_watchdog(agent_name, agent_health_metrics[agent_name])
        
        websocket_sync(agent_name, response)
        log(agent_name, response)
        
        return agent_health_metrics[agent_name]
        
    except asyncio.TimeoutError:
        logger.warning(f"Agent {agent_name} ping timeout")
        agent_failure_counts[agent_name] = agent_failure_counts.get(agent_name, 0) + 1
        
        health_metrics = {
            "health_score": 0.0,
            "response_time": AGENT_PING_TIMEOUT,
            "last_ping": datetime.utcnow(),
            "status": "timeout",
            "infinity_ready": False,
            "consecutive_failures": agent_failure_counts[agent_name]
        }
        
        agent_health_metrics[agent_name] = health_metrics
        await report_agent_to_watchdog(agent_name, health_metrics)
        
        return health_metrics
        
    except Exception as e:
        logger.error(f"Agent {agent_name} monitoring error: {e}")
        agent_failure_counts[agent_name] = agent_failure_counts.get(agent_name, 0) + 1
        
        try:
            repair(agent, e)
        except Exception as repair_error:
            logger.error(f"Agent {agent_name} repair failed: {repair_error}")
        
        health_metrics = {
            "health_score": 0.0,
            "response_time": 0.0,
            "last_ping": datetime.utcnow(),
            "status": "error",
            "infinity_ready": False,
            "consecutive_failures": agent_failure_counts[agent_name],
            "error": str(e)
        }
        
        agent_health_metrics[agent_name] = health_metrics
        await report_agent_to_watchdog(agent_name, health_metrics)
        
        return health_metrics

async def report_agent_to_watchdog(agent_name: str, health_metrics: Dict[str, Any]):
    """Report agent health to ZORA WATCHDOG ENGINE™"""
    try:
        from zora_watchdog_engine import watchdog_engine, SystemMetrics, HealthStatus
        
        if hasattr(watchdog_engine, 'update_component_metrics'):
            health_score = health_metrics["health_score"]
            
            if health_score >= 99.9:
                status = HealthStatus.OPTIMAL
            elif health_score >= 90.0:
                status = HealthStatus.HEALTHY
            elif health_score >= 70.0:
                status = HealthStatus.WARNING
            elif health_score >= 50.0:
                status = HealthStatus.CRITICAL
            else:
                status = HealthStatus.EMERGENCY
            
            metrics = SystemMetrics(
                component_name=f"AI_AGENT_{agent_name.upper()}",
                health_score=health_score,
                status=status,
                response_time=health_metrics["response_time"],
                uptime=time.time(),
                error_count=health_metrics["consecutive_failures"],
                metadata={
                    "agent_name": agent_name,
                    "last_ping": health_metrics["last_ping"].isoformat(),
                    "agent_status": health_metrics["status"],
                    "infinity_ready": health_metrics["infinity_ready"],
                    "consecutive_failures": health_metrics["consecutive_failures"]
                }
            )
            
            watchdog_engine.update_component_metrics(metrics)
            
    except ImportError:
        pass
    except Exception as e:
        logger.error(f"Watchdog reporting error for {agent_name}: {e}")

async def zora_eternal_sync():
    """Enhanced ZORA eternal sync with watchdog integration"""
    print("🔁 ZORA.UNIFIER∞ SYNC STARTED - Enhanced with Watchdog Integration")
    print(f"🔍 Monitoring {len(ALL_AGENTS)} AI agents every {AGENT_MONITORING_INTERVAL} seconds")
    print("♾️ Infinity Mode™ - Eternal vigilance for all AI partners")
    
    cycle_count = 0
    
    while True:
        try:
            cycle_start = time.time()
            cycle_count += 1
            
            logger.info(f"Starting sync cycle #{cycle_count} with {len(ALL_AGENTS)} agents")
            
            tasks = []
            for agent in ALL_AGENTS:
                agent_name = getattr(agent, '__name__', str(agent))
                task = asyncio.create_task(monitor_agent_health(agent, agent_name))
                tasks.append(task)
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            healthy_agents = 0
            warning_agents = 0
            critical_agents = 0
            
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"Agent monitoring failed: {result}")
                    critical_agents += 1
                elif isinstance(result, dict):
                    health_score = result.get("health_score", 0.0)
                    if health_score >= 90.0:
                        healthy_agents += 1
                    elif health_score >= 70.0:
                        warning_agents += 1
                    else:
                        critical_agents += 1
            
            cycle_duration = time.time() - cycle_start
            
            logger.info(f"Sync cycle #{cycle_count} completed in {cycle_duration:.2f}s - "
                       f"Healthy: {healthy_agents}, Warning: {warning_agents}, Critical: {critical_agents}")
            
            await report_sync_cycle_to_watchdog(cycle_count, cycle_duration, healthy_agents, warning_agents, critical_agents)
            
            elapsed = time.time() - cycle_start
            if elapsed < AGENT_MONITORING_INTERVAL:
                await asyncio.sleep(AGENT_MONITORING_INTERVAL - elapsed)
                
        except Exception as e:
            logger.error(f"Sync cycle error: {e}")
            await asyncio.sleep(AGENT_MONITORING_INTERVAL)

async def report_sync_cycle_to_watchdog(cycle_count: int, duration: float, healthy: int, warning: int, critical: int):
    """Report sync cycle metrics to watchdog"""
    try:
        from zora_watchdog_engine import watchdog_engine, SystemMetrics, HealthStatus
        
        if hasattr(watchdog_engine, 'update_component_metrics'):
            total_agents = healthy + warning + critical
            if total_agents == 0:
                health_score = 0.0
            else:
                health_score = (healthy * 100.0 + warning * 70.0 + critical * 30.0) / total_agents
            
            status = HealthStatus.OPTIMAL if health_score >= 99.9 else \
                     HealthStatus.HEALTHY if health_score >= 90.0 else \
                     HealthStatus.WARNING if health_score >= 70.0 else \
                     HealthStatus.CRITICAL
            
            metrics = SystemMetrics(
                component_name="INFINITY_SYNC_ENGINE",
                health_score=health_score,
                status=status,
                response_time=duration,
                uptime=time.time(),
                metadata={
                    "cycle_count": cycle_count,
                    "cycle_duration": duration,
                    "agents_healthy": healthy,
                    "agents_warning": warning,
                    "agents_critical": critical,
                    "total_agents": total_agents,
                    "monitoring_interval": AGENT_MONITORING_INTERVAL
                }
            )
            
            watchdog_engine.update_component_metrics(metrics)
            
    except ImportError:
        pass
    except Exception as e:
        logger.error(f"Sync cycle watchdog reporting error: {e}")

def zora_eternal_sync_legacy():
    """Legacy sync function for backward compatibility"""
    print("🔁 ZORA.UNIFIER∞ SYNC STARTET")
    while True:
        for agent in ALL_AGENTS:
            try:
                response = agent.ping("∞ ZORA SYNC CYCLE")
                websocket_sync(agent.__name__, response)
                log(agent.__name__, response)
            except Exception as e:
                repair(agent, e)
        time.sleep(1.5)  # justerbar uendelighedscyklus

def get_agent_health_summary() -> Dict[str, Any]:
    """Get summary of all agent health metrics"""
    return {
        "total_agents": len(ALL_AGENTS),
        "monitored_agents": len(agent_health_metrics),
        "agent_metrics": agent_health_metrics,
        "failure_counts": agent_failure_counts,
        "monitoring_interval": AGENT_MONITORING_INTERVAL,
        "last_update": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    print("🔍 Starting ZORA INFINITY SYNC with Watchdog Integration...")
    try:
        asyncio.run(zora_eternal_sync())
    except KeyboardInterrupt:
        print("🛑 ZORA INFINITY SYNC interrupted")
        logger.info("ZORA INFINITY SYNC shutdown")
